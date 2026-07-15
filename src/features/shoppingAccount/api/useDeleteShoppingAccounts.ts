import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { deleteShoppingAccounts } from './deleteShoppingAccounts';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';

export const useDeleteShoppingAccounts = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingAccounts(ids, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
    },
  });
};
