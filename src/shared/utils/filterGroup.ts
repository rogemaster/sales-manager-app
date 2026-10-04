import { atom, type Setter } from 'jotai';
import { atomWithReset, RESET } from 'jotai/utils';

/**
 * 목록 화면의 검색 필터 atom 묶음. 묶음으로 만든 atom은 `resetAtom` 하나로 전부 기본값이 된다.
 * 초기화할 atom을 따로 나열하지 않으므로, 새 필터 atom을 추가하면서 초기화 목록에 넣는 것을 빠뜨릴 수 없다.
 * 메뉴를 벗어날 때 `SearchFilterScopeReset`이 `resetAtom`을 부른다(`src/shared/constant/filterScope.constant.ts`).
 */
export const createFilterGroup = () => {
  const resets: ((set: Setter) => void)[] = [];

  return {
    atom: <T>(initialValue: T) => {
      const member = atomWithReset(initialValue);
      resets.push((set) => set(member, RESET));
      return member;
    },
    resetAtom: atom(null, (_get, set) => {
      resets.forEach((reset) => reset(set));
    }),
  };
};
