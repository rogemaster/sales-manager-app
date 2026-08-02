'use client';

import { useAtom, useSetAtom } from 'jotai';
import { currentPageAtom } from '@/features/mallLinkedProduct/store/search.store';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useGetMallLinkedProducts } from '@/features/mallLinkedProduct/api/useGetMallLinkedProducts';
import { MallLinkedProductHeaderSection } from './MallLinkedProductHeaderSection';
import { MallLinkedProductSearchFilterSection } from './MallLinkedProductSearchFilterSection';
import { MallLinkedProductTableSection } from './MallLinkedProductTableSection';

export const MallLinkedProductLayout = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const setSelectedLinkedIds = useSetAtom(selectedLinkedIdsAtom);
  const { data, isLoading, isError } = useGetMallLinkedProducts();

  // 선택은 현재 보이는 페이지 기준이므로, 페이지를 옮기면 이전 선택을 버린다.
  const handleChangePage = (page: number) => {
    setCurrentPage(page);
    setSelectedLinkedIds([]);
  };

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
          onChangePage={handleChangePage}
          isLoading={isLoading}
        />
      )}
    </>
  );
};
