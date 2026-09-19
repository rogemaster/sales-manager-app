import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import type { NaverAddress, NaverAddressType, NaverProductRequest, NaverSeller, NaverStoredProduct } from './types';
import { naverAddresses, naverProducts, naverSellers } from './schema';

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
}

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
      ? { productNo: row.productNo, sellerId: row.sellerId, name: row.name, statusType: row.statusType, payload: row.payload }
      : null;
  },

  findProductByNo: async (productNo) => {
    const [row] = await db.select().from(naverProducts).where(eq(naverProducts.productNo, productNo)).limit(1);
    return row
      ? { productNo: row.productNo, sellerId: row.sellerId, name: row.name, statusType: row.statusType, payload: row.payload }
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
});
