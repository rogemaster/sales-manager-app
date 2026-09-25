import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingAccountsStatus } from './updateShoppingAccountsStatus';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useUpdateShoppingAccountsStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingAccountsStatus(ids, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
