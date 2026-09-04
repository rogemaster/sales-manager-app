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
// - 한 상품이 여러 몰에 연동된 케이스 (남성 티셔츠 → COUP·NSST·GMK 3건)
// - 같은 상품 × 같은 몰 × 같은 설정 조합이 2건 (텀블러 × ss_003) — 중복 연동 허용 모델
// - 실패 3건 — NSST 전용 사유 1종 + fallback 1종 + 중복 사유 1종
//   (MOCK_SHOPPING_SETTINGS_DATA에 KAKAOS 설정이 없어 '상품명 글자 수 초과'는 시드에 나타날 수 없다)
// - 판매상태 4종을 모두 포함 (판매상태 필터 확인용)
//   ON_SALE 8건 / WAIT_SALE 2건(니트 원피스·다이어리) / SOLD_OUT 1건(캠핑 체어) / SALE_DIS 1건(주방장갑)
//
// productId는 Neon에 시드된 오리지널 상품의 실제 코드다(MockProductsData가 그 사본).
// 상품명을 주석으로 함께 적는 이유는 prod_ 접두 코드만으로는 어떤 상품인지 알 수 없기 때문이다.
//
// 날짜는 daysAgo(n)로 "지금으로부터 n일 전"을 부여한다. 상대적 선후 관계(같은 배치는 같은 시각,
// mlp_0005가 mlp_0006보다 먼저)는 기존 절대 날짜 구조와 동일하게 유지한다.
// n은 전부 6 이하다 — 기본 기간 필터가 최근 7일이라, 그보다 오래된 시드는 화면을 처음 열었을 때
// 이유 없이 사라진 것처럼 보인다. 12건이 모두 기본 화면에 들어와 2페이지가 된다.
const SEEDS: SeedInput[] = [
  {
    id: 'mlp_0001',
    productId: 'prod_866a37fe', // 블루투스 이어폰 (ON_SALE)
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_a1b2c3',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(6),
  },
  {
    id: 'mlp_0002',
    productId: 'prod_f19e816d', // 남성 오버핏 반팔 티셔츠 (ON_SALE)
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_d4e5f6',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(5),
  },
  {
    id: 'mlp_0003',
    productId: 'prod_f19e816d', // 남성 오버핏 반팔 티셔츠 — 같은 배치로 네이버에도 전송
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_g7h8i9',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(5),
  },
  {
    id: 'mlp_0004',
    productId: 'prod_f19e816d', // 남성 오버핏 반팔 티셔츠 — 지마켓 전송은 실패
    settingId: 'ss_004',
    status: 'failed',
    errorMessage: '외부 쇼핑몰 전송 실패',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(5),
  },
  {
    id: 'mlp_0005',
    productId: 'prod_9158dfe7', // 스테인리스 텀블러 (ON_SALE)
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_j1k2l3',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(4),
  },
  {
    id: 'mlp_0006',
    productId: 'prod_9158dfe7', // 스테인리스 텀블러 — 같은 몰·설정에 다시 보내 중복으로 실패
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '동일 상품이 이미 등록되어 있습니다',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(3),
  },
  {
    id: 'mlp_0007',
    productId: 'prod_247fc43f', // 극세사 차렵이불 세트 (ON_SALE)
    settingId: 'ss_003',
    status: 'failed',
    errorMessage: '카테고리 매핑 오류',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(3),
  },
  {
    id: 'mlp_0008',
    productId: 'prod_7b29de01', // 여성 롱 니트 원피스 (WAIT_SALE)
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_m4n5o6',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(2),
  },
  {
    id: 'mlp_0009',
    productId: 'prod_36373d83', // 캠핑 접이식 릴렉스 체어 (SOLD_OUT)
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_p7q8r9',
    createdByEmail: SELLER_EMAIL,
    sentAt: daysAgo(2),
  },
  {
    id: 'mlp_0010',
    productId: 'prod_e93eaf44', // 실리콘 방열 주방장갑 (SALE_DIS)
    settingId: 'ss_001',
    status: 'success',
    externalProductId: 'ext_COUP_v4w5x6',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(1),
  },
  {
    id: 'mlp_0011',
    productId: 'prod_fb3d064c', // 2027 위클리 다이어리 (WAIT_SALE)
    settingId: 'ss_003',
    status: 'success',
    externalProductId: 'ext_NSST_s1t2u3',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(1),
  },
  {
    id: 'mlp_0012',
    productId: 'prod_abed32d9', // 초미세먼지 공기청정기 (ON_SALE)
    settingId: 'ss_002',
    status: 'success',
    externalProductId: 'ext_COUP_y7z8a9',
    createdByEmail: STAFF_EMAIL,
    sentAt: daysAgo(0),
  },
];

export const MOCK_MALL_LINKED_PRODUCT_DATA: MallLinkedProduct[] = SEEDS.map(buildSeed);
