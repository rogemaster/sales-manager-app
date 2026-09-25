/**
 * 그대로 limit/offset에 넣으면 테넌트 전체를 한 번에 긁거나(큰 pageSize),
 * offset이 음수가 되어 원인 불명의 500이 된다(page 0).
 */
export const clampPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

/** 목록 하단 페이지 버튼에 보여줄 번호들. 현재 페이지가 속한 range 단위 블록을 돌려준다(TablePagination). */
export const getPage = (range: number, currentPage: number, totalPages: number): number[] => {
  const maxRange = range || 10;

  if (totalPages <= range) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const currentBlock = Math.floor((currentPage - 1) / maxRange);
  const startPage = currentBlock * maxRange + 1;
  const endPage = Math.min(startPage + maxRange - 1, totalPages);
  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
};
