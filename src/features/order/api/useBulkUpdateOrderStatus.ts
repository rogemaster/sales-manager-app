import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { OrderStatusTypes } from '../types/order.types';
import { bulkUpdateOrderStatus } from './bulkUpdateOrderStatus';
import { ORDER_LIST_QUERY_KEY } from './useGetOrders';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';

interface BulkUpdateParams {
  orderNumbers: string[];
  orderStatus: OrderStatusTypes;
}

export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: ({ orderNumbers, orderStatus }: BulkUpdateParams) =>
      bulkUpdateOrderStatus(orderNumbers, orderStatus, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
    },
  });
};
