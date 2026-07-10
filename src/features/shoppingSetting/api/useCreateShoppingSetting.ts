import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { createShoppingSetting } from './createShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { CreateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useCreateShoppingSetting = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: CreateShoppingSettingBody) => createShoppingSetting(body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
