import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/userSearch.store';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getUsers } from './getUsers';

export const USER_LIST_QUERY_KEY = 'userList';

export const useGetUsers = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [USER_LIST_QUERY_KEY, workspaceOwnerId, filters, currentPage],
    queryFn: () => getUsers(filters, currentPage),
    enabled: !!workspaceOwnerId,
  });
};
