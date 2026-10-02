import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { useAlert } from '@/hooks/useAlert';
import { buildBulkResultAlert } from '@/shared/utils/bulkResultAlert';
import { getErrorMessage } from '@/shared/utils/errorMessage';
import { OrderStatusTypes } from '../types/order.types';
import { selectedOrdersAtom } from '../store/search.store';
import { bulkUpdateOrderStatus } from './bulkUpdateOrderStatus';
import { ORDER_LIST_QUERY_KEY } from './useGetOrders';

/** 목록 액션(상태 일괄변경·송장전송)의 mutation 키 접두어. 실행 중 버튼 비활성을 mutation 캐시로 판정한다. */
export const ORDER_LIST_ACTION_MUTATION_KEY = 'orderListAction';

interface BulkUpdateParams {
  orderNumbers: string[];
  orderStatus: OrderStatusTypes;
}

/**
 * 결과 알림·선택 해제·무효화를 훅 단위 콜백에 둔다 — 발주확인은 몰을 불러 오래 걸릴 수 있고,
 * mutate() 호출 단위 콜백은 그 사이 다른 화면으로 가면 실행되지 않는다(라운드 3 수집과 같은 이유).
 */
export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const setSelectedOrders = useSetAtom(selectedOrdersAtom);
  const { showAlert } = useAlert();

  return useMutation({
    mutationKey: [ORDER_LIST_ACTION_MUTATION_KEY, 'status'],
    mutationFn: ({ orderNumbers, orderStatus }: BulkUpdateParams) => bulkUpdateOrderStatus(orderNumbers, orderStatus),
    onSuccess: ({ successCount, failures }) => {
      setSelectedOrders([]);
      showAlert(buildBulkResultAlert('변경', successCount, failures));
    },
    onError: (error) => showAlert({ type: 'error', message: getErrorMessage(error, '주문 상태 변경 실패') }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['home', 'order-stats'] });
    },
  });
};

/** 상태 일괄변경·송장전송 중 하나라도 진행 중이면 true. 화면을 떠났다 와도 mutation 캐시에서 얻는다. */
export const useIsOrderListActionRunning = (): boolean =>
  useIsMutating({ mutationKey: [ORDER_LIST_ACTION_MUTATION_KEY] }) > 0;
