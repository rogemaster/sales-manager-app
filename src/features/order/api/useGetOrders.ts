import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { getOrders } from './getOrders';

export const ORDER_LIST_QUERY_KEY = 'orderList';

export const useGetOrders = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [ORDER_LIST_QUERY_KEY, filters, currentPage],
    queryFn: () => getOrders(filters, currentPage),
  });
};
