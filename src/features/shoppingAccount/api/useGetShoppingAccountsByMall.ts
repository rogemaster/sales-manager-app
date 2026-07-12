import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccountsByMall } from './getShoppingAccountsByMall';
import { ShoppingMalls } from '@/types/common.type';

export const MALL_ACCOUNT_OPTIONS_QUERY_KEY = 'mallAccountOptions';

export const useGetShoppingAccountsByMall = (mallCode: ShoppingMalls | 'ALL') => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_ACCOUNT_OPTIONS_QUERY_KEY, workspaceOwnerId, mallCode],
    queryFn: () => getShoppingAccountsByMall(workspaceOwnerId, mallCode as ShoppingMalls),
    enabled: !!workspaceOwnerId && mallCode !== 'ALL',
  });
};
