import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/search.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingSettings } from './getShoppingSettings';

export const SHOPPING_SETTING_LIST_QUERY_KEY = 'shoppingSettingList';

export const useGetShoppingSettings = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getShoppingSettings(workspaceOwnerId, filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
