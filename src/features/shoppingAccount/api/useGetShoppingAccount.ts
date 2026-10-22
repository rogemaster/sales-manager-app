import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccount } from './getShoppingAccount';
import { SHOPPING_ACCOUNT_QUERY_KEY } from '@/features/shoppingAccount/constant/queryKey.constant';

export const useGetShoppingAccount = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getShoppingAccount(id),
    enabled: !!id && !!workspaceOwnerId,
  });
};
