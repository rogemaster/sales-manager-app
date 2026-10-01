import type { NaverRepository } from './repository';
import type { NaverAddress, NaverSeller, NaverStoredProduct, NaverStoredProductOrder } from './types';
import { normalizeProductName } from './productService';

export interface FakeRepositorySeed {
  sellers?: NaverSeller[];
  addresses?: NaverAddress[];
  products?: NaverStoredProduct[];
  productOrders?: NaverStoredProductOrder[];
  ordersGeneratedAt?: Record<string, Date>;
}

export interface FakeRepository extends NaverRepository {
  products: Map<number, NaverStoredProduct>;
  productOrders: Map<string, NaverStoredProductOrder>;
}

/** 테스트 전용. 앱 코드에서 import하지 않는다. 조건부 UPDATE·선점은 drizzle 구현과 같은 의미로 흉내 낸다. */
export const createFakeRepository = (seed: FakeRepositorySeed = {}): FakeRepository => {
  const sellers = [...(seed.sellers ?? [])];
  const addresses = [...(seed.addresses ?? [])];
  const products = new Map<number, NaverStoredProduct>((seed.products ?? []).map((p) => [p.productNo, p]));
  const productOrders = new Map<string, NaverStoredProductOrder>(
    (seed.productOrders ?? []).map((order) => [order.productOrderId, { ...order }]),
  );
  const generatedAt = new Map<string, Date>(Object.entries(seed.ordersGeneratedAt ?? {}));
  let sequence = Math.max(0, ...[...products.keys()]);

  const ownedOrder = (sellerId: string, productOrderId: string) => {
    const order = productOrders.get(productOrderId);
    return order && order.sellerId === sellerId ? order : undefined;
  };

  return {
    products,
    productOrders,
    findSellerByApiKey: async (apiKey) => sellers.find((seller) => seller.apiKey === apiKey) ?? null,
    listAddresses: async (sellerId, addressType) =>
      addresses.filter((a) => a.sellerId === sellerId && a.addressType === addressType),
    findAddress: async (sellerId, addressId, addressType) =>
      addresses.find((a) => a.sellerId === sellerId && a.addressId === addressId && a.addressType === addressType) ??
      null,
    findProductByNormalizedName: async (sellerId, normalizedName) =>
      [...products.values()].find((p) => p.sellerId === sellerId && normalizeProductName(p.name) === normalizedName) ??
      null,
    findProductByNo: async (productNo) => products.get(productNo) ?? null,
    insertProduct: async (sellerId, request) => {
      sequence += 1;
      products.set(sequence, {
        productNo: sequence,
        sellerId,
        name: request.name,
        statusType: request.statusType,
        payload: request,
      });
      return sequence;
    },
    updateProduct: async (productNo, request) => {
      const stored = products.get(productNo);
      if (!stored) return;
      products.set(productNo, { ...stored, name: request.name, statusType: request.statusType, payload: request });
    },

    findOrdersGeneratedAt: async (sellerId) => generatedAt.get(sellerId) ?? null,
    claimOrderGeneration: async (sellerId, expected, now) => {
      const current = generatedAt.get(sellerId) ?? null;
      if ((current?.getTime() ?? null) !== (expected?.getTime() ?? null)) return false;
      generatedAt.set(sellerId, now);
      return true;
    },
    listSaleProducts: async (sellerId) =>
      [...products.values()].filter((p) => p.sellerId === sellerId && p.statusType === 'SALE'),
    insertProductOrder: async (order) => {
      if (productOrders.has(order.productOrderId)) return false;
      productOrders.set(order.productOrderId, { ...order });
      return true;
    },
    listProductOrders: async ({ sellerId, from, to, after, limit }) =>
      [...productOrders.values()]
        .filter(
          (order) =>
            order.sellerId === sellerId &&
            order.lastChangedAt.getTime() >= from.getTime() &&
            (to === null || order.lastChangedAt.getTime() < to.getTime()) &&
            (after === null ||
              order.lastChangedAt.getTime() > after.lastChangedAt.getTime() ||
              (order.lastChangedAt.getTime() === after.lastChangedAt.getTime() &&
                order.productOrderId.localeCompare(after.productOrderId) > 0)),
        )
        .sort(
          (a, b) =>
            a.lastChangedAt.getTime() - b.lastChangedAt.getTime() || a.productOrderId.localeCompare(b.productOrderId),
        )
        .slice(0, limit),
    findProductOrders: async (sellerId, productOrderIds) =>
      productOrderIds.flatMap((id) => {
        const order = ownedOrder(sellerId, id);
        return order ? [{ ...order }] : [];
      }),
    confirmProductOrders: async (sellerId, productOrderIds, now) =>
      productOrderIds.filter((id) => {
        const order = ownedOrder(sellerId, id);
        if (!order || order.productOrderStatus !== 'PAYED' || order.placeOrderStatus !== 'NOT_YET') return false;
        productOrders.set(id, { ...order, placeOrderStatus: 'OK', lastChangedAt: now });
        return true;
      }),
    dispatchProductOrder: async (sellerId, item, now) => {
      const order = ownedOrder(sellerId, item.productOrderId);
      if (!order || order.productOrderStatus !== 'PAYED' || order.placeOrderStatus !== 'OK') return false;
      productOrders.set(item.productOrderId, {
        ...order,
        productOrderStatus: 'DELIVERING',
        deliveryCompany: item.deliveryCompanyCode,
        trackingNumber: item.trackingNumber,
        dispatchedAt: now,
        lastChangedAt: now,
      });
      return true;
    },
  };
};
