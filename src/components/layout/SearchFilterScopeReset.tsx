'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useStore, type WritableAtom } from 'jotai';
import { FilterScopeId, getFilterScopesToReset } from '@/shared/constant/filterScope.constant';
import { resetFilterAtom as resetUserFilterAtom } from '@/features/account/store/userSearch.store';
import { resetFilterAtom as resetLinkedProductFilterAtom } from '@/features/mallLinkedProduct/store/search.store';
import { resetFilterAtom as resetMallRegistrationFilterAtom } from '@/features/mallRegistration/store/search.store';
import { resetFilterAtom as resetCollectFilterAtom } from '@/features/order/store/collect.store';
import { resetFilterAtom as resetOrderFilterAtom } from '@/features/order/store/search.store';
import { resetFilterAtom as resetProductFilterAtom } from '@/features/products/store/search.store';
import { resetFilterAtom as resetAccountFilterAtom } from '@/features/shoppingAccount/store/search.store';
import { resetFilterAtom as resetSettingFilterAtom } from '@/features/shoppingSetting/store/search.store';

// 범위 id마다 그 화면 store의 초기화 atom. 범위를 추가하고 여기 연결을 빠뜨리면 컴파일 오류가 난다.
const RESET_ATOMS: Record<FilterScopeId, WritableAtom<null, [], void>> = {
  products: resetProductFilterAtom,
  mallRegistration: resetMallRegistrationFilterAtom,
  shoppingAccount: resetAccountFilterAtom,
  shoppingSetting: resetSettingFilterAtom,
  mallLinkedProduct: resetLinkedProductFilterAtom,
  order: resetOrderFilterAtom,
  orderCollect: resetCollectFilterAtom,
  account: resetUserFilterAtom,
};

/**
 * 메뉴를 벗어나면 그 메뉴의 검색 필터를 초기화한다. 같은 메뉴의 상세·등록에 다녀오는 동안은 유지한다.
 * 화면 unmount가 아니라 경로로 판정한다 — 목록 → 상세 이동에서도 목록은 unmount되기 때문이다.
 */
export const SearchFilterScopeReset = () => {
  const pathname = usePathname();
  const store = useStore();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    getFilterScopesToReset(prevPath, pathname).forEach((id) => store.set(RESET_ATOMS[id]));
  }, [pathname, store]);

  return null;
};
