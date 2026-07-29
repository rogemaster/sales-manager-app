import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import type { RegisterProductsToMallsResponse } from '@/features/mallRegistration/api/registerProductsToMalls';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';
import { MallRegistration } from '@/features/products/types/product.types';
import { ShoppingMalls } from '@/types/common.type';

// --- 외부 몰 API 시뮬레이션 전용 상수 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일과 함께 통째로 삭제된다. constant/로 분리하지 않는 이유다.
const FAILURE_RATE = 0.1;
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  NSST: '카테고리 매핑 오류',
  KAKAOS: '상품명 글자 수 초과',
};

const createExternalId = (mallCode: ShoppingMalls) => `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}`;

// mallCode + shoppingSettingId 조합 단위로 upsert한다.
// 재전송은 새 이력이 아니라 기존 등록 건의 상태 갱신이므로 조합당 항상 1건만 유지한다.
const upsertRegistration = (
  registrations: MallRegistration[],
  item: MallRegistrationRequestItem,
  index: number,
  now: string,
  isSuccess: boolean,
) => {
  const errorMessage = MALL_ERROR_MESSAGES[item.mallCode] ?? FALLBACK_ERROR_MESSAGE;
  const existing = registrations.find(
    (r) => r.mallCode === item.mallCode && r.shoppingSettingId === item.shoppingSettingId,
  );

  if (!existing) {
    registrations.push({
      id: `mr_${Date.now()}_${index}`,
      mallCode: item.mallCode,
      shoppingSettingId: item.shoppingSettingId,
      status: isSuccess ? 'success' : 'failed',
      registeredAt: now,
      ...(isSuccess ? { externalId: createExternalId(item.mallCode) } : { errorMessage }),
    });
    return;
  }

  // id는 기존 값을 유지한다 — 후속 화면에서 행 key로 쓸 안정적인 식별자가 필요하다.
  existing.status = isSuccess ? 'success' : 'failed';
  existing.registeredAt = now;

  if (isSuccess) {
    // externalId는 조합당 하나만 유효하다 — 이미 있으면 재전송(수정)이므로 재발급하지 않는다.
    existing.externalId ??= createExternalId(item.mallCode);
    // 성공했으므로 이전 실패 사유를 남겨두면 안 된다.
    delete existing.errorMessage;
  } else {
    existing.errorMessage = errorMessage;
    // externalId는 지우지 않는다 — 이미 외부몰에 올라간 상품의 수정 전송 실패일 수 있다.
  }
};

export const registerMockProductsToMalls = (items: MallRegistrationRequestItem[]): RegisterProductsToMallsResponse => {
  const now = new Date().toISOString();
  const result: RegisterProductsToMallsResponse = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    if (!product) return;
    if (!product.registeredMalls) product.registeredMalls = [];

    const isSuccess = Math.random() >= FAILURE_RATE;
    upsertRegistration(product.registeredMalls, item, index, now, isSuccess);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
