import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccounts } from './getShoppingAccounts';

export const SHOPPING_ACCOUNT_LIST_QUERY_KEY = 'shoppingAccountList';

export const useGetShoppingAccounts = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getShoppingAccounts(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
