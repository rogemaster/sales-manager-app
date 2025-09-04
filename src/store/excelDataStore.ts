import { Atom, atom, useAtomValue } from 'jotai';
import { atomWithReset, selectAtom } from 'jotai/utils';

export interface ExcelDataState<T = Record<string, unknown>> {
  data: T[];
  isUploaded: boolean;
  uploadTime: Date | null;
}

// 초기값으로 되돌릴 수 있는 atom
export const excelDataAtom = atomWithReset<ExcelDataState>({
  data: [],
  isUploaded: false,
  uploadTime: null,
});

// data의 타입을 ExcelDataState['data'] 타입을 지정해 상태 정의와 동기화 처리
export const setExcelDataAtom = atom(null, (_, set, data: ExcelDataState['data']) => {
  set(excelDataAtom, {
    data,
    isUploaded: true,
    uploadTime: new Date(),
  });
});

// selectAtom에 제네릭 선언으로 타입 보장 처리
export function useExcelData<T>() {
  const dataAtom = selectAtom(excelDataAtom as Atom<ExcelDataState<T>>, (state) => state.data);
  return useAtomValue(dataAtom);
}
