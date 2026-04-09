'use client';

import { useState } from 'react';
import { ProductHeaderSection, ProductSearchFilterSection, ProductTableSection } from '@/features/products/ui/list';
import { getSearchFilterAtom } from '../../store/search.store';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../../api/getProducts';
import { Product } from '../../types/product.types';

export const ProductListLayout = () => {
  const data = useAtomValue(getSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(data);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products', appliedFilter],
    queryFn: () => getProducts(appliedFilter),
  });

  const handleSearch = () => {
    console.log('검색버튼');
    setAppliedFilter(data);
  };

  return (
    <>
      {/* 상품 목록 헤더 */}
      <ProductHeaderSection />
      {/* 검색 및 필터 */}
      <ProductSearchFilterSection onSearch={handleSearch} />
      {/* 상품 목록 테이블 */}
      <ProductTableSection products={products} />
    </>
  );
};
