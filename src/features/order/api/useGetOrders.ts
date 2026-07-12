import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getOrders } from './getOrders';

export const ORDER_LIST_QUERY_KEY = 'orderList';

export const useGetOrders = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [ORDER_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getOrders(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
