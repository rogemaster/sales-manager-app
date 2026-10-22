import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccountsByMall } from './getShoppingAccountsByMall';
import { ShoppingMalls } from '@/types/common.type';
import { MALL_ACCOUNT_OPTIONS_QUERY_KEY } from '@/features/shoppingAccount/constant/queryKey.constant';

export const useGetShoppingAccountsByMall = (mallCode: ShoppingMalls | 'ALL') => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_ACCOUNT_OPTIONS_QUERY_KEY, workspaceOwnerId, mallCode],
    queryFn: () => getShoppingAccountsByMall(mallCode as ShoppingMalls),
    enabled: !!workspaceOwnerId && mallCode !== 'ALL',
  });
};
