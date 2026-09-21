import { AlertOptions } from '@/types/common.type';

/** 대량 액션의 건별 실패. 도메인마다 결과 타입은 따로 두되 이 모양은 공유한다. */
export interface BulkFailure {
  id: string;
  message: string;
}

/**
 * 대량 삭제·사용여부 변경 결과를 알림 옵션으로 만든다.
 *
 * 일부 실패는 오류가 아니라 정상 결과다 — 정상 건은 처리되고 실패만 사유와 함께 알린다.
 * 실패 사유를 전부 나열하면 알림이 선택 건수만큼 길어지므로 첫 사유 + 나머지 건수로 줄인다
 * (엑셀 formatExcelFailureSummary와 같은 방침. 그쪽은 시트 행 번호 접두사가 붙어 재사용하지 않는다).
 *
 * 계정·설정 두 도메인이 함께 쓴다. 도메인별로 복제하면 ALL_FILTER_OPTION이 8개 이름으로
 * 갈라졌던 전례를 그대로 반복한다(ui-conventions.md).
 */
export const buildBulkResultAlert = (
  verb: '삭제' | '변경',
  successCount: number,
  failures: BulkFailure[],
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
