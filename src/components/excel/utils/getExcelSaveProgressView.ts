type SaveProgress = { done: number; total: number };
export type ExcelSaveProgressView = { label: string; count: string | null; value: number };

/**
 * 저장 전략의 onProgress는 이미지 가져오기에서만 알린다. 이미지를 다 받은 뒤 상품을 저장하는 동안은 알림이 없어
 * 그대로 보여주면 "50/50"에서 멈춘 것처럼 보이므로, done === total을 상품 정보 저장 단계로 읽는다.
 */
export const getExcelSaveProgressView = (progress: SaveProgress | null): ExcelSaveProgressView => {
  if (!progress) return { label: '저장 준비 중...', count: null, value: 0 };

  const { done, total } = progress;
  if (total === 0) return { label: '상품 정보 저장 중...', count: null, value: 100 };

  return {
    label: done < total ? '이미지 저장 중' : '상품 정보 저장 중...',
    count: `${done} / ${total}`,
    value: Math.round((done / total) * 100),
  };
};
