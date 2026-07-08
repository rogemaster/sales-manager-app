import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteShoppingSettings } from './deleteShoppingSettings';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useDeleteShoppingSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => deleteShoppingSettings(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
