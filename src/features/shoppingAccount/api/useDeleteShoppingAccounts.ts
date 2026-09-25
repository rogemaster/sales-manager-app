import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteShoppingAccounts } from './deleteShoppingAccounts';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useDeleteShoppingAccounts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingAccounts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
