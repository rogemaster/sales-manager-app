import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { MALL_LINKED_PRODUCT_HISTORIES_QUERY_KEY } from './useGetMallLinkedProductHistories';
import { resendMallLinkedProducts } from './resendMallLinkedProducts';

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
