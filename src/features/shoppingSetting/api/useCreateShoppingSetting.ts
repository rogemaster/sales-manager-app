import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createShoppingSetting } from './createShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { CreateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useCreateShoppingSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateShoppingSettingBody) => createShoppingSetting(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
