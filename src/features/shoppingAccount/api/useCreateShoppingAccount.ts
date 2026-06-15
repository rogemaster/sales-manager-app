import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { createShoppingAccount } from './createShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { CreateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useCreateShoppingAccount = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: CreateShoppingAccountBody) => createShoppingAccount(body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
