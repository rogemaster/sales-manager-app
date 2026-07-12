'use client';

import { useState } from 'react';
import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/getProducts';
import { Product } from '../../types/product.types';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';

export const ProductListLayout = () => {
  const currentFilter = useAtomValue(getSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(currentFilter);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchCount, setSearchCount] = useState(0);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['products', workspaceOwnerId, appliedFilter],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter),
    enabled: !!workspaceOwnerId,
  });

  const handleSearch = () => {
    setAppliedFilter(currentFilter);
    setCurrentPage(1);
    setSearchCount((prev) => prev + 1);
  };

  return (
    <>
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection onSearch={handleSearch} />
      {/* 상품 목록 테이블 */}
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <ProductTableSection
          products={products}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
          searchCount={searchCount}
        />
      )}
    </>
  );
};
