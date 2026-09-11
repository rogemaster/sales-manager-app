'use client';

import { useState } from 'react';
import {
  ProductActionSection,
  ProductHeaderSection,
  ProductSearchFilterSection,
  ProductTableSection,
} from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts, GetProductsResponse } from '../../api/getProducts';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { commitProductSearch } from '../../util/productSearch';

export const ProductListLayout = () => {
  const currentFilter = useAtomValue(getSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(currentFilter);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchCount, setSearchCount] = useState(0);
  // 표시 여부는 화면을 떠나면 해제된다(요구사항). 지역 상태가 그것을 그대로 만족하므로
  // 새 Jotai atom을 만들지 않는다. 페이지 이동·재검색은 이 컴포넌트를 언마운트하지 않아 값이 유지된다.
  const [showThumbnail, setShowThumbnail] = useState(false);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data, isLoading, isError } = useQuery<GetProductsResponse>({
    queryKey: ['products', workspaceOwnerId, appliedFilter, currentPage],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = () => {
    setAppliedFilter(commitProductSearch(currentFilter));
    setCurrentPage(1);
    setSearchCount((prev) => prev + 1);
  };

  return (
    <>
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection onSearch={handleSearch} />
      {/* 액션 영역 */}
      <ProductActionSection showThumbnail={showThumbnail} onChangeShowThumbnail={setShowThumbnail} />
      {/* 상품 목록 테이블 */}
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <ProductTableSection
          products={products}
          total={total}
          totalPages={totalPages}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
          searchCount={searchCount}
          showThumbnail={showThumbnail}
        />
      )}
    </>
  );
};
