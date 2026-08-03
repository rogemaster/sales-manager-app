import { ShoppingMalls } from '@/types/common.type';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

// --- 외부 몰 API 시뮬레이션 전용 모듈 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일은 통째로 삭제된다. constant/로 분리하지 않는 이유다.
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
export const nextSequence = () => idSequence++;

export const createLinkedProductId = (sequence: number) => `mlp_${Date.now()}_${sequence}`;

export const createExternalProductId = (mallCode: ShoppingMalls, sequence: number) =>
  `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}${sequence}`;

export const isSendSuccess = () => Math.random() >= FAILURE_RATE;

/**
 * 신규 등록 전송의 실패 사유를 고른다.
 * 외부몰은 같은 상품이 이미 올라가 있으면 중복이라고 실패 응답을 준다.
 * 이 시뮬레이션도 같은 테넌트(ownerId) 안에서 같은 상품 × 같은 몰에 성공 이력이 있으면 중복 사유를 쓴다.
 * ownerId 조건이 없으면 다른 테넌트의 성공 이력 때문에 내 전송이 중복으로 오판될 수 있다.
 */
export const resolveErrorMessage = (productId: string, mallCode: ShoppingMalls, ownerId: string) => {
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
 * 재전송(이미 externalProductId가 있는 건)의 실패 사유.
 * 외부몰에 상품이 이미 있는 상태의 전송은 신규 등록이 아니라 '수정'이라
 * 중복이라는 개념이 성립하지 않는다. 그래서 중복 판정을 하지 않는다.
 */
export const resolveResendErrorMessage = (mallCode: ShoppingMalls) =>
  MALL_ERROR_MESSAGES[mallCode] ?? FALLBACK_ERROR_MESSAGE;
