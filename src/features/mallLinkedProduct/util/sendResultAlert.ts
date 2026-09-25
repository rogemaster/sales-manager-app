type SendResultCounts = { totalCount: number; successCount: number; failCount: number };

/**
 * 연동상품 전송·재전송·일괄수정 결과 알림. 네 화면(상품등록 전송, 연동상품 재전송, 일괄수정, 설정 일괄적용)이 같은 문구를 쓴다.
 * 쇼핑몰계정·설정의 건별 결과({ successCount, failures })는 모양이 달라 buildBulkResultAlert를 쓴다.
 */
export const buildSendResultAlert = (
  { totalCount, successCount, failCount }: SendResultCounts,
  kind: 'send' | 'update',
): { type: 'success' | 'warning'; message: string } => {
  if (failCount === 0) {
    return {
      type: 'success',
      message: kind === 'send' ? `${successCount}건이 쇼핑몰로 전송되었습니다.` : `${successCount}건이 수정되었습니다.`,
    };
  }
  const done = kind === 'send' ? '전송 성공' : '수정';
  return { type: 'warning', message: `총 ${totalCount}건 중 ${successCount}건 ${done}, ${failCount}건 실패했습니다.` };
};
