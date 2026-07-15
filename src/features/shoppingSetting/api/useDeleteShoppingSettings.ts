import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { deleteShoppingSettings } from './deleteShoppingSettings';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useDeleteShoppingSettings = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingSettings(ids, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
