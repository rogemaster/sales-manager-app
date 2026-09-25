import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UpdateMallLinkedProductBody } from '../types/mallLinkedProduct.types';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { updateMallLinkedProduct } from './updateMallLinkedProduct';

export const useUpdateMallLinkedProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshots: UpdateMallLinkedProductBody) => updateMallLinkedProduct(id, snapshots),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id] });
    },
  });
};
