import { AlertOptions } from '@/types/common.type';
import { BulkAccountFailure } from '../types/shoppingAccount.types';

/** 남의 계정이든 없는 계정이든 같은 문구를 쓴다. 구분해 답하면 남의 id를 탐색하는 도구가 된다. */
export const ACCOUNT_NOT_FOUND_MESSAGE = '존재하지 않는 계정입니다.';

/**
 * 대량 삭제·사용여부 변경 결과를 알림 옵션으로 만든다.
 *
 * 일부 실패는 오류가 아니라 정상 결과다 — 정상 건은 처리되고 실패만 사유와 함께 알린다.
 * 실패 사유를 전부 나열하면 알림이 선택 건수만큼 길어지므로 첫 사유 + 나머지 건수로 줄인다
 * (엑셀 formatExcelFailureSummary와 같은 방침. 그쪽은 시트 행 번호 접두사가 붙어 재사용하지 않는다).
 */
export const buildBulkAccountAlert = (
  verb: '삭제' | '변경',
  successCount: number,
  failures: BulkAccountFailure[],
): AlertOptions => {
  const [first] = failures;
  const rest = failures.length - 1;
  const reason = first ? `${first.message}${rest > 0 ? ` (외 ${rest}건 오류)` : ''}` : '';

  if (failures.length === 0) {
    return { type: 'success', message: `${successCount}건이 ${verb}되었습니다.` };
  }

  if (successCount === 0) {
    return { type: 'error', message: reason };
  }

  return { type: 'warning', message: `${successCount}건이 ${verb}되었습니다. ${reason}` };
};
