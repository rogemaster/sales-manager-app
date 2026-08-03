import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getMallLinkedProduct } from './getMallLinkedProduct';

export const MALL_LINKED_PRODUCT_QUERY_KEY = 'mallLinkedProduct';

export const useGetMallLinkedProduct = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getMallLinkedProduct(id, workspaceOwnerId),
    enabled: !!workspaceOwnerId && !!id,
  });
};
