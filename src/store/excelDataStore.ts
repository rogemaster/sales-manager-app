import { atom } from 'jotai';

export interface ExcelDataState<T = Record<string, unknown>> {
  data: T[];
  isUploaded: boolean;
  uploadTime: Date | null;
}

// 제네릭 타입을 받는 atom 생성 함수
export function createExcelDataAtom<T = Record<string, unknown>>() {
  const baseAtom = atom<ExcelDataState<T>>({
    data: [],
    isUploaded: false,
    uploadTime: null,
  });

  const setExcelDataAtom = atom(null, (_, set, data: T[]) => {
    set(baseAtom, {
      data,
      isUploaded: true,
      uploadTime: new Date(),
    });
  });

  const clearExcelDataAtom = atom(null, (_, set) => {
    set(baseAtom, {
      data: [],
      isUploaded: false,
      uploadTime: null,
    });
  });

  return {
    baseAtom,
    setExcelDataAtom,
    clearExcelDataAtom,
  };
}

// 기본 타입용 atom
export const excelDataAtom = atom<ExcelDataState>({
  data: [],
  isUploaded: false,
  uploadTime: null,
});
