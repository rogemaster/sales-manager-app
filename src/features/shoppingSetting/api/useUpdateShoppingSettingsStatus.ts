import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingSettingsStatus } from './updateShoppingSettingsStatus';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';

export const useUpdateShoppingSettingsStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, isActive }: { ids: string[]; isActive: boolean }) =>
      updateShoppingSettingsStatus(ids, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
