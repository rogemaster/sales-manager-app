import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { collectFiltersAtom } from '../store/collect.store';
import { getCollectionAccounts } from './getCollectionAccounts';
import { COLLECTION_ACCOUNTS_QUERY_KEY } from '@/features/order/constant/queryKey.constant';

export const useGetCollectionAccounts = () => {
  const filters = useAtomValue(collectFiltersAtom);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [COLLECTION_ACCOUNTS_QUERY_KEY, workspaceOwnerId, filters],
    queryFn: () => getCollectionAccounts(filters),
    enabled: !!workspaceOwnerId,
  });
};
