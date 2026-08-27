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
      // 목록은 화면에 떠 있으므로 무효화하면 곧바로 다시 불러온다.
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });

      // 상세 캐시는 무효화가 아니라 제거한다. 무효화만 하면 수정 화면에 들어가는 순간
      // React Query가 캐시된 '수정 전' 스냅샷을 먼저 그리고 그 뒤에 새 값으로 다시 그리는데,
      // 그 사이에 RHF reset이 두 번 돌면서 지워진 필드가 화면에 남는다.
      // RHF의 reset은 값이 undefined인 필드를 건너뛴다(_reset의 `if (!isUndefined(value))`).
      // 그래서 1차 reset이 넣어둔 옛 값이 2차 reset에서 지워지지 않고 DOM에 그대로 남는다.
      // 일괄수정 직후의 상세 캐시는 틀린 것이 확실하므로, 보여주지 않는 편이 맞다.
      queryClient.removeQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
    },
  });
};
