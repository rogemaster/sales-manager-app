import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { BulkUpdateMallLinkedProductsBody } from '../types/mallLinkedProduct.types';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { bulkUpdateMallLinkedProducts } from './bulkUpdateMallLinkedProducts';

/** ownerId·updatedByEmail은 호출부가 넘기지 않는다 — useUpdateMallLinkedProduct와 같은 방식. */
export type BulkUpdateVariables = Omit<BulkUpdateMallLinkedProductsBody, 'ownerId' | 'updatedByEmail'>;

export const useBulkUpdateMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: BulkUpdateVariables) =>
      bulkUpdateMallLinkedProducts({ ownerId: workspaceOwnerId, updatedByEmail: email, ...variables }),
    onSuccess: () => {
      // 목록뿐 아니라 개별 상세 캐시도 오래된 스냅샷을 들고 있게 되므로 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
    },
  });
};
