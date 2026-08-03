import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { updateMallLinkedProduct } from './updateMallLinkedProduct';

export interface MallLinkedProductSnapshots {
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;
}

export const useUpdateMallLinkedProduct = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshots: MallLinkedProductSnapshots) =>
      updateMallLinkedProduct(id, workspaceOwnerId, { updatedByEmail: email, ...snapshots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id] });
    },
  });
};
