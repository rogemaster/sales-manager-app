import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

/**
 * 연동상품 시드 전용 사본이다. 설정은 Neon으로 이전됐고(실행 순서 3) 화면은 이 배열을 쓰지 않는다.
 *
 * 남겨둔 이유: MockMallLinkedProductsData가 모듈 스코프에서 동기적으로 스냅샷을 만들어
 * await을 쓸 수 없다. 상품도 같은 처지다(MOCK_PRODUCT_DATA).
 * 순서 4에서 연동상품이 DB로 가면 이 파일도 함께 사라진다.
 */

const SAMPLE_SHIPPING_ADDRESS = {
  code: 'COUP-WH-01',
  name: '쿠팡 본사 물류센터',
  zipCode: '08589',
  address: '서울특별시 금천구 가산디지털1로 168',
  addressDetail: '3층 301호',
};

const SAMPLE_RETURN_ADDRESS = {
  code: 'COUP-WH-02',
  name: '쿠팡 경기 물류센터',
  zipCode: '14548',
  address: '경기도 부천시 원미구 길주로 210',
  addressDetail: '2층 202호',
};

// 시뮬레이터 naver_addresses의 실제 값이다(scripts/seedShoppingSettings.ts와 동일). 순서 4의
// 전송에서 이 코드가 실재 검증을 통과해야 한다.
const NAVER_SHIPPING_ADDRESS = {
  code: 'naver_seller_1_shipping',
  name: '기본 출고지',
  zipCode: '08589',
  address: '서울특별시 금천구 가산디지털1로 168',
  addressDetail: '3층 301호',
};

const NAVER_RETURN_ADDRESS = {
  code: 'naver_seller_1_return',
  name: '기본 반품지',
  zipCode: '14548',
  address: '경기도 부천시 원미구 길주로 210',
  addressDetail: '2층 202호',
};

const GMK_SHIPPING_ADDRESS = { ...SAMPLE_SHIPPING_ADDRESS, code: 'GMK-WH-01' };
const GMK_RETURN_ADDRESS = { ...SAMPLE_RETURN_ADDRESS, code: 'GMK-WH-02' };

export const MOCK_SHOPPING_SETTINGS_DATA: ShoppingSetting[] = [
  {
    id: 'ss_001',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡 메인 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 30,
    shippingAddress: SAMPLE_SHIPPING_ADDRESS,
    returnAddress: SAMPLE_RETURN_ADDRESS,
    ownerId: 'usr_2f20748f',
    createdAt: new Date('2025-05-01'),
    updatedAt: new Date('2025-05-01'),
  },
  {
    id: 'ss_002',
    mallAccountId: 'sa_001',
    mallCode: 'COUP',
    mallId: 'coupang_seller_001',
    nickname: '쿠팡 프로모션용',
    isActive: true,
    productCondition: 'USED',
    salesPeriod: 15,
    shippingAddress: SAMPLE_SHIPPING_ADDRESS,
    returnAddress: SAMPLE_RETURN_ADDRESS,
    ownerId: 'usr_2f20748f',
    createdAt: new Date('2025-05-10'),
    updatedAt: new Date('2025-05-12'),
  },
  {
    id: 'ss_003',
    mallAccountId: 'sa_002',
    mallCode: 'NSST',
    mallId: 'naver_store_002',
    nickname: '네이버 기본 설정',
    isActive: true,
    productCondition: 'NEW',
    salesPeriod: 60,
    shippingAddress: NAVER_SHIPPING_ADDRESS,
    returnAddress: NAVER_RETURN_ADDRESS,
    mallSettings: {
      afterServiceContact: '1588-0000',
      purchaseReviewExposure: true,
      certificationInfo: 'KC-2026-001',
    },
    ownerId: 'usr_2f20748f',
    createdAt: new Date('2025-05-15'),
    updatedAt: new Date('2025-05-15'),
  },
  {
    id: 'ss_004',
    mallAccountId: 'sa_004',
    mallCode: 'GMK',
    mallId: 'gmarket_seller_004',
    nickname: '지마켓 설정',
    isActive: false,
    productCondition: 'NEW',
    salesPeriod: 90,
    shippingAddress: GMK_SHIPPING_ADDRESS,
    returnAddress: GMK_RETURN_ADDRESS,
    ownerId: 'usr_2f20748f',
    createdAt: new Date('2025-05-20'),
    updatedAt: new Date('2025-05-22'),
  },
];
