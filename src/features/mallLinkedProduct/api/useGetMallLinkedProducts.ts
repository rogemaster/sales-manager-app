import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { getMallLinkedProducts } from './getMallLinkedProducts';

export const MALL_LINKED_PRODUCTS_QUERY_KEY = 'mallLinkedProducts';

export const useGetMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const committedFilters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY, workspaceOwnerId, committedFilters, currentPage],
    queryFn: () => getMallLinkedProducts(workspaceOwnerId, committedFilters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
