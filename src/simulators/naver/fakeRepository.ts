import type { NaverRepository } from './repository';
import type { NaverAddress, NaverSeller, NaverStoredProduct } from './types';
import { normalizeProductName } from './productService';

export interface FakeRepositorySeed {
  sellers?: NaverSeller[];
  addresses?: NaverAddress[];
  products?: NaverStoredProduct[];
}

export interface FakeRepository extends NaverRepository {
  products: Map<number, NaverStoredProduct>;
}

/** 테스트 전용. 앱 코드에서 import하지 않는다. */
export const createFakeRepository = (seed: FakeRepositorySeed = {}): FakeRepository => {
  const sellers = [...(seed.sellers ?? [])];
  const addresses = [...(seed.addresses ?? [])];
  const products = new Map<number, NaverStoredProduct>((seed.products ?? []).map((p) => [p.productNo, p]));
  let sequence = Math.max(0, ...[...products.keys()]);

  return {
    products,
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
  };
};
