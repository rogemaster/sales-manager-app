'use client';

import { atom, useAtomValue } from 'jotai';
import { atomWithReset, selectAtom, useResetAtom } from 'jotai/utils';

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

// hook.js:608 Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.

// data atom을 미리 생성하여 참조 동일성 보장
const dataAtom = selectAtom(excelDataAtom, (state) => state.data);

// selectAtom에 제네릭 선언으로 타입 보장 처리
export function useExcelData() {
  return useAtomValue(dataAtom);
}

// 페이지/레이아웃 이탈 시 상태 초기화를 위한 훅
export function useResetExcelData() {
  return useResetAtom(excelDataAtom);
}

// export function useExcelData<T>() {
//   const dataAtom = selectAtom(excelDataAtom as Atom<ExcelDataState<T>>, (state) => state.data);
//   return useAtomValue(dataAtom);
// }
