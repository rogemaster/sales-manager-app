import { describe, expect, it } from 'vitest';
import { createFakeRepository } from './fakeRepository';
import { normalizeProductName, registerProduct, updateProduct } from './productService';
import type { NaverAddress, NaverSeller } from './types';

const SELLER: NaverSeller = { id: 'seller_1', apiKey: 'key-1', name: '판매자1' };
const OTHER_SELLER: NaverSeller = { id: 'seller_2', apiKey: 'key-2', name: '판매자2' };

const address = (sellerId: string, addressId: string, addressType: NaverAddress['addressType']): NaverAddress => ({
  addressId,
  sellerId,
  addressType,
  name: '기본주소',
  zipCode: '06236',
  address: '서울시 강남구',
  addressDetail: '1층',
});

const ADDRESSES = [
  address(SELLER.id, 'ADDR_S1', 'SHIPPING'),
  address(SELLER.id, 'ADDR_R1', 'RETURN'),
  address(OTHER_SELLER.id, 'ADDR_S2', 'SHIPPING'),
  address(OTHER_SELLER.id, 'ADDR_R2', 'RETURN'),
];

const request = (overrides: Record<string, unknown> = {}) => ({
  name: '테스트 상품',
  statusType: 'SALE',
  leafCategoryId: 'CAT_1',
  detailContent: '<p>상세</p>',
  images: { representativeImage: { url: 'https://cdn.example.com/a.png' } },
  salePrice: 10000,
  stockQuantity: 5,
  deliveryInfo: {
    deliveryFeeType: 'FREE',
    baseFee: 0,
    deliveryCompany: 'CJ',
    shippingAddressId: 'ADDR_S1',
    returnAddressId: 'ADDR_R1',
  },
  brandName: '브랜드',
  manufacturerName: '제조사',
  productInfoProvidedNotice: { type: 'ETC' },
  ...overrides,
});

const repo = () => createFakeRepository({ sellers: [SELLER, OTHER_SELLER], addresses: ADDRESSES });

describe('normalizeProductName', () => {
  it('앞뒤 공백과 대소문자를 무시한다', () => {
    expect(normalizeProductName('  Apple Watch ')).toBe('apple watch');
  });
});

describe('registerProduct', () => {
  it('등록에 성공하면 번호를 발급한다', async () => {
    const result = await registerProduct(repo(), SELLER, request());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.originProductNo).toBeGreaterThan(0);
  });

  it('필드가 틀리면 INVALID이고 invalidInputs를 싣는다', async () => {
    const result = await registerProduct(repo(), SELLER, request({ name: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID');
      expect(result.invalidInputs.map((e) => e.name)).toContain('name');
    }
  });

  it('같은 판매자에 같은 이름이면 DUPLICATE다', async () => {
    const repository = repo();
    await registerProduct(repository, SELLER, request());
    const result = await registerProduct(repository, SELLER, request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DUPLICATE');
  });

  it('공백·대소문자만 다른 이름도 DUPLICATE다', async () => {
    const repository = repo();
    await registerProduct(repository, SELLER, request({ name: 'Apple Watch' }));
    const result = await registerProduct(repository, SELLER, request({ name: '  apple watch  ' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DUPLICATE');
  });

  it('다른 판매자는 같은 이름이어도 등록된다', async () => {
    const repository = repo();
    await registerProduct(repository, SELLER, request());
    const result = await registerProduct(
      repository,
      OTHER_SELLER,
      request({ deliveryInfo: { ...request().deliveryInfo, shippingAddressId: 'ADDR_S2', returnAddressId: 'ADDR_R2' } }),
    );
    expect(result.ok).toBe(true);
  });

  it('없는 출고지 ID는 NOT_FOUND 위반이다', async () => {
    const result = await registerProduct(
      repo(),
      SELLER,
      request({ deliveryInfo: { ...request().deliveryInfo, shippingAddressId: 'NOPE' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('INVALID');
      expect(result.invalidInputs[0]).toMatchObject({ name: 'deliveryInfo.shippingAddressId', type: 'NOT_FOUND' });
    }
  });

  it('용도가 어긋난 주소록 ID도 걸린다 (반품지 자리에 출고지 ID)', async () => {
    const result = await registerProduct(
      repo(),
      SELLER,
      request({ deliveryInfo: { ...request().deliveryInfo, returnAddressId: 'ADDR_S1' } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.invalidInputs[0].name).toBe('deliveryInfo.returnAddressId');
  });

  it('남의 주소록 ID는 쓸 수 없다', async () => {
    const result = await registerProduct(
      repo(),
      SELLER,
      request({ deliveryInfo: { ...request().deliveryInfo, shippingAddressId: 'ADDR_S2' } }),
    );
    expect(result.ok).toBe(false);
  });
});

describe('updateProduct', () => {
  it('수정에 성공하면 같은 번호를 돌려준다', async () => {
    const repository = repo();
    const created = await registerProduct(repository, SELLER, request());
    if (!created.ok) throw new Error('등록 실패');

    const result = await updateProduct(repository, SELLER, created.data.originProductNo, request({ salePrice: 20000 }));
    expect(result.ok).toBe(true);
    expect(repository.products.get(created.data.originProductNo)?.payload.salePrice).toBe(20000);
  });

  it('없는 번호는 NOT_FOUND다', async () => {
    const result = await updateProduct(repo(), SELLER, 9999, request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOT_FOUND');
  });

  it('남의 상품은 존재해도 NOT_FOUND다', async () => {
    const repository = repo();
    const created = await registerProduct(repository, SELLER, request());
    if (!created.ok) throw new Error('등록 실패');

    const result = await updateProduct(repository, OTHER_SELLER, created.data.originProductNo, request());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('NOT_FOUND');
  });

  it('이름을 자기 다른 상품과 같게 바꾸면 DUPLICATE다', async () => {
    const repository = repo();
    await registerProduct(repository, SELLER, request({ name: '먼저 등록' }));
    const second = await registerProduct(repository, SELLER, request({ name: '나중 등록' }));
    if (!second.ok) throw new Error('등록 실패');

    const result = await updateProduct(repository, SELLER, second.data.originProductNo, request({ name: '먼저 등록' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('DUPLICATE');
  });

  it('자기 이름을 그대로 둔 수정은 DUPLICATE가 아니다', async () => {
    const repository = repo();
    const created = await registerProduct(repository, SELLER, request());
    if (!created.ok) throw new Error('등록 실패');

    const result = await updateProduct(repository, SELLER, created.data.originProductNo, request({ stockQuantity: 9 }));
    expect(result.ok).toBe(true);
  });
});
