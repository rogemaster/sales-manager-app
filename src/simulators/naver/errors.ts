import type { InvalidInput, SimulatorFailureReason } from './types';

/** 403·308은 쓰지 않는다 — 계정 상태 개념이 없고 리디렉션 상황도 없다. */
export type NaverErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';

export interface NaverErrorBody {
  code: NaverErrorCode;
  message: string;
  invalidInputs: InvalidInput[];
  timestamp: string;
}

export interface NaverErrorResponse {
  status: number;
  body: NaverErrorBody;
}

const FAILURE_MAP: Record<SimulatorFailureReason, { status: number; code: NaverErrorCode; message: string }> = {
  INVALID: { status: 400, code: 'BAD_REQUEST', message: '요청 값이 올바르지 않습니다.' },
  DUPLICATE: { status: 400, code: 'BAD_REQUEST', message: '이미 등록된 상품입니다.' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: '인가되지 않은 요청입니다.' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: '데이터가 존재하지 않습니다.' },
};

export const toErrorResponse = (
  reason: SimulatorFailureReason,
  invalidInputs: InvalidInput[] = [],
  now: Date = new Date(),
): NaverErrorResponse => {
  const { status, code, message } = FAILURE_MAP[reason];
  return { status, body: { code, message, invalidInputs, timestamp: now.toISOString() } };
};

/** 일부러 내지 않는다. 잡히지 않은 예외의 마지막 그물이며 예외 메시지·스택을 싣지 않는다. */
export const toInternalErrorResponse = (now: Date = new Date()): NaverErrorResponse => ({
  status: 500,
  body: {
    code: 'INTERNAL_SERVER_ERROR',
    message: '내부 서버 오류가 발생했습니다.',
    invalidInputs: [],
    timestamp: now.toISOString(),
  },
});
