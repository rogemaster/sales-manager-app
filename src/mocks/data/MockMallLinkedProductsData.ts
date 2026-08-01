import dayjs from 'dayjs';
import { MallLinkedProduct, MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from './MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from './MockShoppingSettingsData';

const OWNER_ID = 'usr_2f20748f';
const SELLER_EMAIL = 'seller@shop.com';
const STAFF_EMAIL = 'staff@shop.com';

// 시드 날짜는 절대값이 아니라 "지금으로부터 N일 전" 상대값이어야 한다.
// 기본 기간 필터가 dayjs().subtract(7, 'day')라, 절대 날짜 시드는 시간이 지나면 기본 화면이 비어버린다.
// 같은 전송 배치는 같은 시각을 공유해야 하므로 NOW를 한 번만 고정하고 여기서 파생시킨다.
const NOW = dayjs();
const daysAgo = (n: number) => NOW.subtract(n, 'day').toISOString();

interface SeedInput {
  id: string;
  productId: string;
  settingId: string;
  status: MallLinkStatus;
  externalProductId?: string;
  errorMessage?: string;
  createdByEmail: string;
  sentAt: string;
}

const buildSeed = ({
  id,
  productId,
  settingId,
  status,
  externalProductId,
  errorMessage,
  createdByEmail,
  sentAt,
}: SeedInput): MallLinkedProduct => {
  const product = MOCK_PRODUCT_DATA.find((p) => p.productId === productId);
  const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === settingId);

  if (!product || !setting) {
    throw new Error(`시드 데이터 참조 오류: ${productId} / ${settingId}`);
  }

  return {
    id,
    ownerId: OWNER_ID,
    sourceProductId: product.productId,
    sourceShoppingSettingId: setting.id,
    mallCode: setting.mallCode,
    status,
    externalProductId,
    errorMessage,
    productSnapshot: structuredClone(product),
    settingSnapshot: structuredClone(setting),
    createdByEmail,
    createdAt: sentAt,
    lastSentAt: sentAt,
    updatedAt: sentAt,
  };
};

// 화면에서 다음이 확인되도록 구성한다.
// - 한 상품이 여러 몰에 연동된 케이스 (smp000002)
// - 같은 상품 × 같은 몰 × 같은 설정 조합이 2건 (smp000003 × ss_003) — 중복 연동 허용 모델
// - 실패 3건 — NSST 전용 사유 1종 + fallback 1종 + 중복 사유 1종
//   (MOCK_SHOPPING_SETTINGS_DATA에 KAKAOS 설정이 없어 '상품명 글자 수 초과'는 시드에 나타날 수 없다)
// - 판매상태가 서로 다른 상품 (판매상태 필터 확인용)
// 날짜는 daysAgo(n)로 "지금으로부터 n일 전"을 부여한다. 상대적 선후 관계(같은 배치는 같은 시각,
// mlp_0005가 mlp_0006보다 먼저)는 기존 절대 날짜 구조와 동일하게 유지한다.
const SEEDS: SeedInput[] = [
  {
    id: 'mlp_0001',
    productId: 'smp000001',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_a1b2c3',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(12),
  },
  {
    id: 'mlp_0002',
    productId: 'smp000002',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_d4e5f6',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(10),
  },
  {
    id: 'mlp_0003',
    productId: 'smp000002',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_g7h8i9',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(10),
  },
  {
    id: 'mlp_0004',
    productId: 'smp000002',
    settingId: 'ss_004',
    status: 'failed',
    errorMessage: '외부 쇼핑몰 전송 실패',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(10),
  },
  {
    id: 'mlp_0005',
    productId: 'smp000003',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_j1k2l3',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(7),
  },
  {
    id: 'mlp_0006',
    productId: 'smp000003',
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '동일 상품이 이미 등록되어 있습니다',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(6),
  },
  {
    id: 'mlp_0007',
    productId: 'smp000004',
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '카테고리 매핑 오류',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(5),
  },
  {
    id: 'mlp_0008',
    productId: 'smp000005',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_m4n5o6',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(4),
  },
  {
    id: 'mlp_0009',
    productId: 'smp000006',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_p7q8r9',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(3),
  },
  {
    id: 'mlp_0010',
    productId: 'smp000007',
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_s1t2u3',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(2),
  },
  {
    id: 'mlp_0011',
    productId: 'smp000008',
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_v4w5x6',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(1),
  },
  {
    id: 'mlp_0012',
    productId: 'smp000009',
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_y7z8a9',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(0),
  },
];

export const MOCK_MALL_LINKED_PRODUCT_DATA: MallLinkedProduct[] = SEEDS.map(buildSeed);
