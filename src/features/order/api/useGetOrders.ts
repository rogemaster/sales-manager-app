import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getOrders } from './getOrders';
import { ORDER_LIST_QUERY_KEY } from '@/features/order/constant/queryKey.constant';

export const useGetOrders = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [ORDER_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getOrders(filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
