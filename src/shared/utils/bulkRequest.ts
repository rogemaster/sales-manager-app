import { z } from 'zod';
import { INVALID_BODY_MESSAGE } from '@/shared/utils/requestBody';
import { BulkFailure } from '@/shared/utils/bulkResultAlert';

export const INVALID_IDS_MESSAGE = '선택한 항목이 올바르지 않습니다.';
export const INVALID_IS_ACTIVE_MESSAGE = '사용여부 값이 올바르지 않습니다.';

// 같은 id가 두 번 오면 한 번만 처리한다. 두 번 세면 실패 목록에 이미 처리된 id가 섞인다.
const idsSchema = z
  .array(z.string({ invalid_type_error: INVALID_IDS_MESSAGE }), {
    required_error: INVALID_IDS_MESSAGE,
    invalid_type_error: INVALID_IDS_MESSAGE,
  })
  .transform((ids) => [...new Set(ids)]);

/** 선택한 행 id 목록을 받는 요청(삭제, 연동 건수). 빈 목록은 통과한다 — 처리할 것이 없다는 정상 요청이다. */
export const bulkIdsRequestSchema = z.object({ ids: idsSchema }, { invalid_type_error: INVALID_BODY_MESSAGE });

/**
 * 사용여부 일괄 변경 요청. ids와 isActive를 한 번에 검사하므로, 빈 목록이어도 isActive가 틀리면 400이다 —
 * 쇼핑몰계정·정보설정 status route가 같은 요청에 같은 응답을 준다.
 */
export const bulkStatusRequestSchema = bulkIdsRequestSchema.extend({
  isActive: z.boolean({ required_error: INVALID_IS_ACTIVE_MESSAGE, invalid_type_error: INVALID_IS_ACTIVE_MESSAGE }),
});

/**
 * 요청한 id 중 처리되지 않은 것을 실패로 모은다. WHERE에 소유자 조건이 있어 남의 것과 없는 것이
 * 같은 "처리 안 됨"으로 나오므로 사유는 하나다.
 * neon-http에 트랜잭션이 없어 "전부 아니면 전무"를 약속할 수 없으므로 부분 성공이 정상 결과다.
 */
export const toBulkResult = (
  requestedIds: readonly string[],
  doneIds: readonly string[],
  failureMessage: string,
): { successCount: number; failures: BulkFailure[] } => {
  const done = new Set(doneIds);
  return {
    successCount: done.size,
    failures: requestedIds.filter((id) => !done.has(id)).map((id) => ({ id, message: failureMessage })),
  };
};
