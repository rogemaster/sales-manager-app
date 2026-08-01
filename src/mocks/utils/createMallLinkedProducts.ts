import {
  CreateMallLinkedProductsResult,
  MallLinkedProduct,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingMalls } from '@/types/common.type';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

// --- 외부 몰 API 시뮬레이션 전용 상수 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일과 함께 통째로 삭제된다. constant/로 분리하지 않는 이유다.
const FAILURE_RATE = 0.1;
const DUPLICATE_ERROR_MESSAGE = '동일 상품이 이미 등록되어 있습니다';
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  NSST: '카테고리 매핑 오류',
  KAKAOS: '상품명 글자 수 초과',
};

// Date.now()는 밀리초 단위라 같은 조합을 짧은 시간(또는 같은 밀리초)에 연속 전송하면 값이 겹칠 수 있고,
// 테스트에서 Math.random()을 상수로 고정하면 externalProductId도 겹칠 수 있다.
// 두 값 모두 이 모듈 스코프 카운터를 섞어 프로세스 내에서 유일함을 보장한다.
let idSequence = 0;
const nextSequence = () => idSequence++;

const createLinkedProductId = (sequence: number) => `mlp_${Date.now()}_${sequence}`;

const createExternalProductId = (mallCode: ShoppingMalls, sequence: number) =>
  `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}${sequence}`;

// 외부몰은 같은 상품이 이미 올라가 있으면 중복이라고 실패 응답을 준다.
// 이 시뮬레이션도 같은 테넌트(ownerId) 안에서 같은 상품 × 같은 몰에 성공 이력이 있으면 중복 사유를 쓴다.
// ownerId 조건이 없으면 다른 테넌트의 성공 이력 때문에 내 전송이 중복으로 오판될 수 있다.
const resolveErrorMessage = (productId: string, mallCode: ShoppingMalls, ownerId: string) => {
  const hasSuccess = MOCK_MALL_LINKED_PRODUCT_DATA.some(
    (linked) =>
      linked.ownerId === ownerId &&
      linked.sourceProductId === productId &&
      linked.mallCode === mallCode &&
      linked.status === 'success',
  );

  if (hasSuccess) return DUPLICATE_ERROR_MESSAGE;
  return MALL_ERROR_MESSAGES[mallCode] ?? FALLBACK_ERROR_MESSAGE;
};

/**
 * 전송 시점의 상품·설정 값을 스냅샷으로 복사해 연동 데이터를 새로 만든다.
 * 같은 조합이 이미 있어도 갱신하지 않고 항상 새 건을 추가한다 — 연동 데이터 1건 = 외부몰 상품 1개.
 */
export const createMockMallLinkedProducts = (
  items: MallLinkedProductRequestItem[],
  ownerId: string,
  createdByEmail: string,
): CreateMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: CreateMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === item.shoppingSettingId);
    if (!product || !setting) return;

    const isSuccess = Math.random() >= FAILURE_RATE;
    // 실패 사유 판정은 이번 건을 배열에 넣기 전에 해야 한다. 넣은 뒤에 하면 자기 자신을 중복으로 본다.
    // mallCode는 클라이언트가 보낸 item이 아니라 조회된 setting에서 가져온다 — 어긋난 쌍이 오면
    // settingSnapshot.mallCode와 레코드의 mallCode가 갈라져 몰/쇼핑몰계정 필터가 서로 다른 답을 낸다.
    const errorMessage = isSuccess ? undefined : resolveErrorMessage(item.productId, setting.mallCode, ownerId);
    const sequence = nextSequence();

    const linked: MallLinkedProduct = {
      id: createLinkedProductId(sequence),
      ownerId,
      sourceProductId: product.productId,
      sourceShoppingSettingId: setting.id,
      mallCode: setting.mallCode,
      status: isSuccess ? 'success' : 'failed',
      externalProductId: isSuccess ? createExternalProductId(setting.mallCode, sequence) : undefined,
      errorMessage,
      // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 오리지널과 공유되어 스냅샷 독립성이 깨진다.
      productSnapshot: structuredClone(product),
      settingSnapshot: structuredClone(setting),
      createdByEmail,
      createdAt: now,
      lastSentAt: now,
      updatedAt: now,
    };

    MOCK_MALL_LINKED_PRODUCT_DATA.push(linked);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
