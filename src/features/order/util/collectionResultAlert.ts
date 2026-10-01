import { AlertOptions } from '@/types/common.type';
import { CollectionAccountResult } from '../types/collection.types';

/**
 * 수집 결과 알림. 계정 단위 부분 성공이 정상 결과다 — 첫 실패 사유 + 나머지 건수로 줄인다(buildBulkResultAlert와 같은 방침).
 * 실패한 계정도 실패 전에 넣은 주문이 있을 수 있어 신규·중복 합계는 전체 결과에서 낸다.
 */
export const buildCollectionResultAlert = (results: CollectionAccountResult[]): AlertOptions => {
  const failures = results.filter((result) => result.status === 'FAILED');
  const completed = results.length - failures.length;
  const newCount = results.reduce((sum, result) => sum + result.newCount, 0);
  const duplicateCount = results.reduce((sum, result) => sum + result.duplicateCount, 0);
  const summary = `${completed}개 계정 수집 완료 — 신규 ${newCount}건, 중복 ${duplicateCount}건`;

  if (failures.length === 0) return { type: 'success', message: summary };

  const rest = failures.length - 1;
  const reason = `${failures[0].errorMessage ?? '수집 실패'}${rest > 0 ? ` (외 ${rest}건 오류)` : ''}`;
  if (completed === 0) return { type: 'error', message: reason };
  return { type: 'warning', message: `${summary}. ${reason}` };
};
