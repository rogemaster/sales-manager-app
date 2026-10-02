import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useAlert } from '@/hooks/useAlert';
import { buildBulkResultAlert } from '@/shared/utils/bulkResultAlert';
import { getErrorMessage } from '@/shared/utils/errorMessage';
import { selectedOrdersAtom } from '../store/search.store';
import { sendOrderInvoices } from './sendOrderInvoices';
import { ORDER_LIST_ACTION_MUTATION_KEY } from './useBulkUpdateOrderStatus';
import { ORDER_LIST_QUERY_KEY } from './useGetOrders';

/** 송장전송. 콜백을 훅 단위에 두는 이유는 useBulkUpdateOrderStatus와 같다. */
export const useSendOrderInvoices = () => {
  const queryClient = useQueryClient();
  const setSelectedOrders = useSetAtom(selectedOrdersAtom);
  const { showAlert } = useAlert();

  return useMutation({
    mutationKey: [ORDER_LIST_ACTION_MUTATION_KEY, 'invoice'],
    mutationFn: (orderNumbers: string[]) => sendOrderInvoices(orderNumbers),
    onSuccess: ({ successCount, failures }) => {
      setSelectedOrders([]);
      showAlert(buildBulkResultAlert('전송', successCount, failures));
    },
    onError: (error) => showAlert({ type: 'error', message: getErrorMessage(error, '송장전송 실패') }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['home', 'order-stats'] });
    },
  });
};
