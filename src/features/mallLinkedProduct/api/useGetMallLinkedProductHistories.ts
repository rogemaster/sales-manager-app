import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getMallLinkedProductHistories } from './getMallLinkedProductHistories';
import { MALL_LINKED_PRODUCT_HISTORIES_QUERY_KEY } from '@/features/mallLinkedProduct/constant/queryKey.constant';

export const useGetMallLinkedProductHistories = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCT_HISTORIES_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getMallLinkedProductHistories(id),
    enabled: !!workspaceOwnerId && !!id,
  });
};
