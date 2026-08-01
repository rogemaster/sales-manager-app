'use client';

import { useAtom } from 'jotai';
import { currentPageAtom } from '@/features/mallLinkedProduct/store/search.store';
import { useGetMallLinkedProducts } from '@/features/mallLinkedProduct/api/useGetMallLinkedProducts';
import { MallLinkedProductHeaderSection } from './MallLinkedProductHeaderSection';
import { MallLinkedProductSearchFilterSection } from './MallLinkedProductSearchFilterSection';
import { MallLinkedProductTableSection } from './MallLinkedProductTableSection';

export const MallLinkedProductLayout = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading, isError } = useGetMallLinkedProducts();

  return (
    <>
      <MallLinkedProductHeaderSection />
      <MallLinkedProductSearchFilterSection />
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">연동 상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <MallLinkedProductTableSection
          linkedProducts={data?.linkedProducts ?? []}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
