import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createShoppingSetting } from './createShoppingSetting';
import { CreateShoppingSettingBody } from '../types/shoppingSetting.types';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from '@/features/shoppingSetting/constant/queryKey.constant';

export const useCreateShoppingSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateShoppingSettingBody) => createShoppingSetting(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
    },
  });
};
