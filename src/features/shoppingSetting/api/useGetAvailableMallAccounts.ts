import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getAvailableMallAccounts } from './getAvailableMallAccounts';
import { AVAILABLE_MALL_ACCOUNTS_QUERY_KEY } from '@/features/shoppingSetting/constant/queryKey.constant';

export const useGetAvailableMallAccounts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [AVAILABLE_MALL_ACCOUNTS_QUERY_KEY, workspaceOwnerId],
    queryFn: () => getAvailableMallAccounts(),
    enabled: !!workspaceOwnerId,
  });
};
