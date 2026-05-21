import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderStatusTypes } from '../types/order.types';
import { bulkUpdateOrderStatus } from './bulkUpdateOrderStatus';
import { ORDER_LIST_QUERY_KEY } from './useGetOrders';

interface BulkUpdateParams {
  orderNumbers: string[];
  orderStatus: OrderStatusTypes;
}

export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderNumbers, orderStatus }: BulkUpdateParams) =>
      bulkUpdateOrderStatus(orderNumbers, orderStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
    },
  });
};
