import { useMutation, useQueryClient } from '@tanstack/react-query';
import { approveUsers } from './approveUsers';
import { USER_LIST_QUERY_KEY } from './useGetUsers';

export const useApproveUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => approveUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_LIST_QUERY_KEY] });
    },
  });
};
