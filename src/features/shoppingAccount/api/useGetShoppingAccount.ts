import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccount } from './getShoppingAccount';

export const SHOPPING_ACCOUNT_QUERY_KEY = 'shoppingAccount';

export const useGetShoppingAccount = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getShoppingAccount(id, workspaceOwnerId),
    enabled: !!id && !!workspaceOwnerId,
  });
};
