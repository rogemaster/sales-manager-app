import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { committedFilterAtom, currentPageAtom } from '../store/search.store';
import { getMallLinkedProducts } from './getMallLinkedProducts';

export const MALL_LINKED_PRODUCTS_QUERY_KEY = 'mallLinkedProducts';

export const useGetMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const committedFilter = useAtomValue(committedFilterAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY, workspaceOwnerId, committedFilter, currentPage],
    queryFn: () => getMallLinkedProducts(workspaceOwnerId, committedFilter, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
