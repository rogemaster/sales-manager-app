import { and, asc, eq, gt, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import type {
  NaverAddress,
  NaverAddressType,
  NaverDispatchItem,
  NaverProductOrderCursor,
  NaverProductRequest,
  NaverSeller,
  NaverStoredProduct,
  NaverStoredProductOrder,
} from './types';
import { naverAddresses, naverProductOrders, naverProducts, naverSellers } from './schema';

export interface ProductOrderListQuery {
  sellerId: string;
  from: Date;
  /** null이면 상한 없음 — 방금 만든 주문(last_changed_at = now)이 빠지지 않게. */
  to: Date | null;
  /**
   * null이면 처음부터. 있으면 (변경 시각, 번호)가 이 값보다 뒤인 것만 — offset이 아니라 커서인 이유:
   * 페이지 사이에 발주확인·발송처리로 변경 시각이 바뀐 주문은 뒤로 옮겨질 뿐이라, 아직 읽지 않은 주문이 앞으로 당겨져 빠지지 않는다.
   */
  after: NaverProductOrderCursor | null;
  limit: number;
}

/**
 * 서비스가 주입받는 저장소. 이 인터페이스 덕분에 서비스 테스트가 DB 없이 돈다.
 * drizzle 구현은 같은 파일 아래쪽의 createNaverRepository다.
 */
export interface NaverRepository {
  findSellerByApiKey(apiKey: string): Promise<NaverSeller | null>;
  listAddresses(sellerId: string, addressType: NaverAddressType): Promise<NaverAddress[]>;
  findAddress(sellerId: string, addressId: string, addressType: NaverAddressType): Promise<NaverAddress | null>;
  findProductByNormalizedName(sellerId: string, normalizedName: string): Promise<NaverStoredProduct | null>;
  findProductByNo(productNo: number): Promise<NaverStoredProduct | null>;
  insertProduct(sellerId: string, request: NaverProductRequest): Promise<number>;
  updateProduct(productNo: number, request: NaverProductRequest): Promise<void>;
  findOrdersGeneratedAt(sellerId: string): Promise<Date | null>;
  /** 읽은 생성 시각(expected)이 그대로일 때만 now로 바꾼다. 동시 조회가 둘 다 주문을 만들지 않게 하는 선점이다. */
  claimOrderGeneration(sellerId: string, expected: Date | null, now: Date): Promise<boolean>;
  listSaleProducts(sellerId: string): Promise<NaverStoredProduct[]>;
  /** 상품주문번호가 겹치면 false — 서비스가 번호를 바꿔 1회 다시 시도한다. */
  insertProductOrder(order: NaverStoredProductOrder): Promise<boolean>;
  listProductOrders(query: ProductOrderListQuery): Promise<NaverStoredProductOrder[]>;
  findProductOrders(sellerId: string, productOrderIds: string[]): Promise<NaverStoredProductOrder[]>;
  /** PAYED + NOT_YET만 OK로 바꾸고 바뀐 번호를 돌려준다. 확인과 쓰기 사이 끼어든 요청을 두 번 처리하지 않는다. */
  confirmProductOrders(sellerId: string, productOrderIds: string[], now: Date): Promise<string[]>;
  /** PAYED + OK일 때만 DELIVERING으로 바꾼다. 건마다 송장 값이 달라 한 건씩이다. */
  dispatchProductOrder(sellerId: string, item: NaverDispatchItem, now: Date): Promise<boolean>;
}

const toStoredProductOrder = (row: typeof naverProductOrders.$inferSelect): NaverStoredProductOrder => ({
  productOrderId: row.productOrderId,
  orderId: row.orderId,
  sellerId: row.sellerId,
  productNo: row.productNo,
  productOrderStatus: row.productOrderStatus,
  placeOrderStatus: row.placeOrderStatus,
  paymentDate: row.paymentDate,
  createdAt: row.createdAt,
  lastChangedAt: row.lastChangedAt,
  deliveryCompany: row.deliveryCompany,
  trackingNumber: row.trackingNumber,
  dispatchedAt: row.dispatchedAt,
  payload: row.payload,
});

export const createNaverRepository = (): NaverRepository => ({
  findSellerByApiKey: async (apiKey) => {
    const [row] = await db.select().from(naverSellers).where(eq(naverSellers.apiKey, apiKey)).limit(1);
    return row ? { id: row.id, apiKey: row.apiKey, name: row.name } : null;
  },

  listAddresses: async (sellerId, addressType) =>
    db
      .select()
      .from(naverAddresses)
      .where(and(eq(naverAddresses.sellerId, sellerId), eq(naverAddresses.addressType, addressType))),

  findAddress: async (sellerId, addressId, addressType) => {
    const [row] = await db
      .select()
      .from(naverAddresses)
      .where(
        and(
          eq(naverAddresses.sellerId, sellerId),
          eq(naverAddresses.addressId, addressId),
          eq(naverAddresses.addressType, addressType),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  findProductByNormalizedName: async (sellerId, normalizedName) => {
    const [row] = await db
      .select()
      .from(naverProducts)
      .where(
        and(
          eq(naverProducts.sellerId, sellerId),
          // schema.ts의 유니크 인덱스와 같은 식이다.
          sql`lower(btrim(${naverProducts.name})) = ${normalizedName}`,
        ),
      )
      .limit(1);
    return row
      ? {
          productNo: row.productNo,
          sellerId: row.sellerId,
          name: row.name,
          statusType: row.statusType,
          payload: row.payload,
        }
      : null;
  },

  findProductByNo: async (productNo) => {
    const [row] = await db.select().from(naverProducts).where(eq(naverProducts.productNo, productNo)).limit(1);
    return row
      ? {
          productNo: row.productNo,
          sellerId: row.sellerId,
          name: row.name,
          statusType: row.statusType,
          payload: row.payload,
        }
      : null;
  },

  insertProduct: async (sellerId, request) => {
    const now = new Date();
    const [row] = await db
      .insert(naverProducts)
      .values({
        sellerId,
        name: request.name,
        statusType: request.statusType,
        payload: request,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ productNo: naverProducts.productNo });
    return row.productNo;
  },

  updateProduct: async (productNo, request) => {
    await db
      .update(naverProducts)
      .set({ name: request.name, statusType: request.statusType, payload: request, updatedAt: new Date() })
      .where(eq(naverProducts.productNo, productNo));
  },

  findOrdersGeneratedAt: async (sellerId) => {
    const [row] = await db
      .select({ ordersGeneratedAt: naverSellers.ordersGeneratedAt })
      .from(naverSellers)
      .where(eq(naverSellers.id, sellerId))
      .limit(1);
    return row?.ordersGeneratedAt ?? null;
  },

  claimOrderGeneration: async (sellerId, expected, now) => {
    const [row] = await db
      .update(naverSellers)
      .set({ ordersGeneratedAt: now })
      .where(
        and(
          eq(naverSellers.id, sellerId),
          expected === null ? isNull(naverSellers.ordersGeneratedAt) : eq(naverSellers.ordersGeneratedAt, expected),
        ),
      )
      .returning({ id: naverSellers.id });
    return Boolean(row);
  },

  listSaleProducts: async (sellerId) => {
    const rows = await db
      .select()
      .from(naverProducts)
      .where(and(eq(naverProducts.sellerId, sellerId), eq(naverProducts.statusType, 'SALE')));
    return rows.map((row) => ({
      productNo: row.productNo,
      sellerId: row.sellerId,
      name: row.name,
      statusType: row.statusType,
      payload: row.payload,
    }));
  },

  insertProductOrder: async (order) => {
    const rows = await db
      .insert(naverProductOrders)
      .values(order)
      .onConflictDoNothing({ target: naverProductOrders.productOrderId })
      .returning({ productOrderId: naverProductOrders.productOrderId });
    return rows.length > 0;
  },

  listProductOrders: async ({ sellerId, from, to, after, limit }) => {
    const rows = await db
      .select()
      .from(naverProductOrders)
      .where(
        and(
          eq(naverProductOrders.sellerId, sellerId),
          gte(naverProductOrders.lastChangedAt, from),
          to === null ? undefined : lt(naverProductOrders.lastChangedAt, to),
          after === null
            ? undefined
            : or(
                gt(naverProductOrders.lastChangedAt, after.lastChangedAt),
                and(
                  eq(naverProductOrders.lastChangedAt, after.lastChangedAt),
                  gt(naverProductOrders.productOrderId, after.productOrderId),
                ),
              ),
        ),
      )
      .orderBy(asc(naverProductOrders.lastChangedAt), asc(naverProductOrders.productOrderId))
      .limit(limit);
    return rows.map(toStoredProductOrder);
  },

  findProductOrders: async (sellerId, productOrderIds) => {
    if (productOrderIds.length === 0) return [];
    const rows = await db
      .select()
      .from(naverProductOrders)
      .where(
        and(eq(naverProductOrders.sellerId, sellerId), inArray(naverProductOrders.productOrderId, productOrderIds)),
      );
    return rows.map(toStoredProductOrder);
  },

  confirmProductOrders: async (sellerId, productOrderIds, now) => {
    if (productOrderIds.length === 0) return [];
    const rows = await db
      .update(naverProductOrders)
      .set({ placeOrderStatus: 'OK', lastChangedAt: now })
      .where(
        and(
          eq(naverProductOrders.sellerId, sellerId),
          inArray(naverProductOrders.productOrderId, productOrderIds),
          eq(naverProductOrders.productOrderStatus, 'PAYED'),
          eq(naverProductOrders.placeOrderStatus, 'NOT_YET'),
        ),
      )
      .returning({ productOrderId: naverProductOrders.productOrderId });
    return rows.map((row) => row.productOrderId);
  },

  dispatchProductOrder: async (sellerId, item, now) => {
    const rows = await db
      .update(naverProductOrders)
      .set({
        productOrderStatus: 'DELIVERING',
        deliveryCompany: item.deliveryCompanyCode,
        trackingNumber: item.trackingNumber,
        dispatchedAt: now,
        lastChangedAt: now,
      })
      .where(
        and(
          eq(naverProductOrders.sellerId, sellerId),
          eq(naverProductOrders.productOrderId, item.productOrderId),
          eq(naverProductOrders.productOrderStatus, 'PAYED'),
          eq(naverProductOrders.placeOrderStatus, 'OK'),
        ),
      )
      .returning({ productOrderId: naverProductOrders.productOrderId });
    return rows.length > 0;
  },
});
