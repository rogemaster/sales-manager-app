import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingSetting } from './updateShoppingSetting';
import { UpdateShoppingSettingBody } from '../types/shoppingSetting.types';
import {
  SHOPPING_SETTING_LIST_QUERY_KEY,
  SHOPPING_SETTING_QUERY_KEY,
} from '@/features/shoppingSetting/constant/queryKey.constant';

export const useUpdateShoppingSetting = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingSettingBody) => updateShoppingSetting(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
