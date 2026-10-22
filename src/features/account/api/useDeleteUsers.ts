import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUsers } from './deleteUsers';
import { USER_LIST_QUERY_KEY } from '@/features/account/constant/queryKey.constant';

export const useDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_LIST_QUERY_KEY] });
    },
  });
};
