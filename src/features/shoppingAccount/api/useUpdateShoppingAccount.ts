import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingAccount } from './updateShoppingAccount';
import { UpdateShoppingAccountBody } from '../types/shoppingAccount.types';
import {
  SHOPPING_ACCOUNT_LIST_QUERY_KEY,
  SHOPPING_ACCOUNT_QUERY_KEY,
} from '@/features/shoppingAccount/constant/queryKey.constant';

export const useUpdateShoppingAccount = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingAccountBody) => updateShoppingAccount(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
