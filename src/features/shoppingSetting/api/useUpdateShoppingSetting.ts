import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingSetting } from './updateShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { SHOPPING_SETTING_QUERY_KEY } from './useGetShoppingSetting';
import { UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useUpdateShoppingSetting = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingSettingBody) => updateShoppingSetting(id, body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
