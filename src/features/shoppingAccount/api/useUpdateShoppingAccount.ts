import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingAccount } from './updateShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useUpdateShoppingAccount = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateShoppingAccountBody) => updateShoppingAccount(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['shoppingAccount', id] });
    },
  });
};
