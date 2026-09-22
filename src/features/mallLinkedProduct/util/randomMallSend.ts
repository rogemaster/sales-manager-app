import { randomUUID } from 'crypto';
import { ShoppingMalls } from '@/types/common.type';
import { MallLinkSendSource, MallLinkStatus } from '../types/mallLinkedProduct.types';

/** 전송 1건의 결과. 시뮬레이터·랜덤 판정이 같은 모양을 돌려준다. */
export interface MallSendOutcome {
  status: MallLinkStatus;
  /** 성공이면 새로 받았거나 유지한 코드, 실패면 기존 코드(있을 때). 실패해도 지우지 않는다. */
  externalProductId?: string;
  errorMessage?: string;
  source: MallLinkSendSource;
}

// 시뮬레이터가 없는 몰(네이버 외)의 흉내낸 판정이다. 옛 mocks/utils/mallLinkSimulation.ts에서 옮겼다.
const FAILURE_RATE = 0.1;
const DUPLICATE_ERROR_MESSAGE = '동일 상품이 이미 등록되어 있습니다';
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  KAKAOS: '상품명 글자 수 초과',
};

/**
 * hasPriorSuccess는 같은 테넌트 × 같은 상품 × 같은 몰에 (자기 자신이 아닌) 성공 건이 있는지다. 호출자가 DB로 구한다.
 * externalProductId가 있으면 그 전송은 신규 등록이 아니라 수정이라 중복이라는 개념이 성립하지 않는다.
 */
export const judgeRandomSend = (
  input: { mallCode: ShoppingMalls; externalProductId?: string; hasPriorSuccess: boolean },
  random: () => number = Math.random,
): MallSendOutcome => {
  const { mallCode, externalProductId, hasPriorSuccess } = input;

  if (random() >= FAILURE_RATE) {
    return {
      status: 'success',
      externalProductId: externalProductId ?? `ext_${mallCode}_${randomUUID().slice(0, 8)}`,
      source: 'random',
    };
  }

  const errorMessage =
    !externalProductId && hasPriorSuccess
      ? DUPLICATE_ERROR_MESSAGE
      : (MALL_ERROR_MESSAGES[mallCode] ?? FALLBACK_ERROR_MESSAGE);

  return { status: 'failed', externalProductId, errorMessage, source: 'random' };
};
