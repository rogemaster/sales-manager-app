import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createShoppingAccount } from './createShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { CreateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useCreateShoppingAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateShoppingAccountBody) => createShoppingAccount(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
