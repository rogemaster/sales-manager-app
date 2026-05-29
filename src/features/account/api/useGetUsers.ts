import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { committedFiltersAtom, currentPageAtom } from '../store/userSearch.store';
import { getUsers } from './getUsers';

export const USER_LIST_QUERY_KEY = 'userList';

export const useGetUsers = () => {
  const filters = useAtomValue(committedFiltersAtom);
  const currentPage = useAtomValue(currentPageAtom);

  return useQuery({
    queryKey: [USER_LIST_QUERY_KEY, filters, currentPage],
    queryFn: () => getUsers(filters, currentPage),
  });
};
