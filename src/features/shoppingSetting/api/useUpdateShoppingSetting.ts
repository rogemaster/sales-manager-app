import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateShoppingSetting } from './updateShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { SHOPPING_SETTING_QUERY_KEY } from './useGetShoppingSetting';
import { UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useUpdateShoppingSetting = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateShoppingSettingBody) => updateShoppingSetting(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_QUERY_KEY, id] });
    },
  });
};
