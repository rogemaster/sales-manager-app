import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingSetting } from './getShoppingSetting';

export const SHOPPING_SETTING_QUERY_KEY = 'shoppingSetting';

export const useGetShoppingSetting = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_SETTING_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getShoppingSetting(id, workspaceOwnerId),
    enabled: !!id && !!workspaceOwnerId,
  });
};
