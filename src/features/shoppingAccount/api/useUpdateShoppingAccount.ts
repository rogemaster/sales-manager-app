import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingAccount } from './updateShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { SHOPPING_ACCOUNT_QUERY_KEY } from './useGetShoppingAccount';
import { UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useUpdateShoppingAccount = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingAccountBody) => updateShoppingAccount(id, body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
