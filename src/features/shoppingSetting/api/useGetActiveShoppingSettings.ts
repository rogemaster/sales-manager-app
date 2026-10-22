import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getActiveShoppingSettings } from './getActiveShoppingSettings';
import { ACTIVE_SHOPPING_SETTINGS_QUERY_KEY } from '@/features/shoppingSetting/constant/queryKey.constant';

export const useGetActiveShoppingSettings = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [ACTIVE_SHOPPING_SETTINGS_QUERY_KEY, workspaceOwnerId],
    queryFn: () => getActiveShoppingSettings(),
    enabled: !!workspaceOwnerId,
  });
};
