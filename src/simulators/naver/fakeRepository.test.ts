import { describe, expect, it } from 'vitest';
import { createFakeRepository } from './fakeRepository';
import type { NaverProductRequest, NaverStoredProduct } from './types';

const request = { name: '새 상품' } as unknown as NaverProductRequest;

const seeded = (productNo: number): NaverStoredProduct =>
  ({ productNo, sellerId: 'seller_1', name: `상품${productNo}`, statusType: 'SALE', payload: request }) as NaverStoredProduct;

describe('createFakeRepository.insertProduct', () => {
  it('비어 있으면 1번부터 발급한다', async () => {
    const repository = createFakeRepository();
    expect(await repository.insertProduct('seller_1', request)).toBe(1);
  });

  it('번호가 연속이 아닌 시드가 있어도 기존 상품을 덮어쓰지 않는다', async () => {
    const repository = createFakeRepository({ products: [seeded(2)] });

    const productNo = await repository.insertProduct('seller_1', request);

    expect(productNo).toBeGreaterThan(2);
    expect((await repository.findProductByNo(2))?.name).toBe('상품2');
  });

  it('연달아 넣으면 매번 다른 번호를 준다', async () => {
    const repository = createFakeRepository();

    const first = await repository.insertProduct('seller_1', request);
    const second = await repository.insertProduct('seller_1', request);

    expect(second).not.toBe(first);
  });
});
