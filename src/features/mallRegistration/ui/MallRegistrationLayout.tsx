'use client';

import { useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getProducts, GetProductsResponse } from '@/features/products/api/getProducts';
import { commitProductSearch } from '@/features/products/util/productSearch';
import { getMallRegistrationSearchFilterAtom } from '@/features/mallRegistration/store/search.store';
import { resetMallRegistrationStateAtom } from '@/features/mallRegistration/store/mallRegistration.store';
import { MallRegistrationHeaderSection } from './MallRegistrationHeaderSection';
import { MallRegistrationSearchFilterSection } from './MallRegistrationSearchFilterSection';
import { MallRegistrationActionSection } from './MallRegistrationActionSection';
import { MallRegistrationTableSection } from './MallRegistrationTableSection';
import { MallSelectModal } from './components/MallSelectModal';

export const MallRegistrationLayout = () => {
  const currentFilter = useAtomValue(getMallRegistrationSearchFilterAtom);
  const [appliedFilter, setAppliedFilter] = useState(currentFilter);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const resetState = useSetAtom(resetMallRegistrationStateAtom);

  const { data, isLoading, isError } = useQuery<GetProductsResponse>({
    queryKey: ['mallRegistrationProducts', workspaceOwnerId, appliedFilter, currentPage],
    queryFn: () => getProducts(workspaceOwnerId, appliedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });

  useEffect(() => resetState, [resetState]);

  const handleSearch = () => {
    setAppliedFilter(commitProductSearch(currentFilter));
    setCurrentPage(1);
  };

  return (
    <>
      <MallRegistrationHeaderSection />
      <MallRegistrationSearchFilterSection onSearch={handleSearch} />
      <MallRegistrationActionSection />
      {isError ? (
        <p className="py-10 text-center text-sm text-destructive">상품 목록을 불러오는데 실패했습니다.</p>
      ) : (
        <MallRegistrationTableSection
          products={data?.products ?? []}
          total={data?.total ?? 0}
          totalPages={data?.totalPages ?? 1}
          currentPage={currentPage}
          onChangePage={setCurrentPage}
          isLoading={isLoading}
        />
      )}
      <MallSelectModal />
    </>
  );
};
