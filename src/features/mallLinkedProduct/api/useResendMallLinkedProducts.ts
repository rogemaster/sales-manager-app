import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resendMallLinkedProducts } from './resendMallLinkedProducts';
import {
  MALL_LINKED_PRODUCTS_QUERY_KEY,
  MALL_LINKED_PRODUCT_QUERY_KEY,
  MALL_LINKED_PRODUCT_HISTORIES_QUERY_KEY,
} from '@/features/mallLinkedProduct/constant/queryKey.constant';

export const useResendMallLinkedProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => resendMallLinkedProducts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_HISTORIES_QUERY_KEY] });
    },
  });
};
