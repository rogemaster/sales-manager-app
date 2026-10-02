'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectedOrdersAtom } from '@/features/order/store/search.store';
import { useGetOrders } from '@/features/order/api/useGetOrders';
import { useBulkUpdateOrderStatus, useIsOrderListActionRunning } from '@/features/order/api/useBulkUpdateOrderStatus';
import { useSendOrderInvoices } from '@/features/order/api/useSendOrderInvoices';
import { useAlert } from '@/hooks/useAlert';
import { findOrderStatusChangeViolation, USER_SELECTABLE_ORDER_STATUS } from '@/features/order/util/orderStatusRule';
import { findConfirmViolation, findInvoiceSendViolation } from '@/features/order/util/orderBulkStatus';
import { OrderStatusTypes } from '@/features/order/types/order.types';

export const OrderListActionSection = () => {
  const selectedOrders = useAtomValue(selectedOrdersAtom);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const { data } = useGetOrders();
  const { mutate: bulkUpdate } = useBulkUpdateOrderStatus();
  const { mutate: sendInvoices } = useSendOrderInvoices();
  // 몰을 부르는 동안(발주확인·송장전송) 세 버튼을 막는다. 화면을 떠났다 와도 mutation 캐시에서 얻는다.
  const isRunning = useIsOrderListActionRunning();
  const { showAlert } = useAlert();

  const orders = data?.orders ?? [];
  const selectedRows = () => orders.filter((o) => selectedOrders.includes(o.orderNumber));

  // 서버(POST /api/orders/status)와 같은 규칙으로 미리 막는다. 서버도 같은 함수로 한 번 더 거른다.
  // 발주확인은 계정 있는 발주확인·송장등록 주문을 통과시킨다 — 서버가 몰에 다시 보낸다(스펙 결정 8).
  const findSelectionViolation = (next: OrderStatusTypes) =>
    selectedRows()
      .map((o) =>
        next === 'CONFIRMED_ORDER' ? findConfirmViolation(o) : findOrderStatusChangeViolation(o.orderStatus, next),
      )
      .find((message) => message !== null);

  // 결과 알림·선택 해제는 훅이 한다 — 처리 중 화면을 떠나도 알림이 뜬다.
  const runBulkUpdate = (orderStatus: OrderStatusTypes) =>
    bulkUpdate({ orderNumbers: [...selectedOrders], orderStatus });

  const handleBulkStatusChange = () => {
    if (selectedOrders.length === 0) {
      showAlert({ message: '변경할 주문을 선택해주세요.', type: 'warning' });
      return;
    }
    if (!targetStatus) {
      showAlert({ message: '변경할 주문 상태를 선택해주세요.', type: 'warning' });
      return;
    }

    const violation = findSelectionViolation(targetStatus as OrderStatusTypes);
    if (violation) {
      showAlert({ title: '상태 변경 불가', message: violation, type: 'warning' });
      return;
    }

    showAlert({
      title: '주문상태 일괄변경',
      message: `선택한 ${selectedOrders.length}건의 주문 상태를 변경하시겠습니까?`,
      showCancel: true,
      onConfirm: () => runBulkUpdate(targetStatus as OrderStatusTypes),
    });
  };

  const handleBulkConfirm = () => {
    if (selectedOrders.length === 0) {
      showAlert({ message: '변경할 주문을 선택해주세요.', type: 'warning' });
      return;
    }

    const violation = findSelectionViolation('CONFIRMED_ORDER');
    if (violation) {
      showAlert({ title: '발주확인 변경 불가', message: violation, type: 'warning' });
      return;
    }

    showAlert({
      title: '발주확인 일괄변경',
      message: `선택한 ${selectedOrders.length}건을 발주확인으로 변경하시겠습니까?`,
      showCancel: true,
      onConfirm: () => runBulkUpdate('CONFIRMED_ORDER'),
    });
  };

  const handleInvoiceSend = () => {
    if (selectedOrders.length === 0) {
      showAlert({ message: '전송할 주문을 선택해주세요.', type: 'warning' });
      return;
    }

    // 서버(POST /api/orders/invoice/send)와 같은 판정으로 미리 막는다.
    const violation = selectedRows()
      .map((o) => findInvoiceSendViolation(o))
      .find((message) => message !== null);
    if (violation) {
      showAlert({ title: '송장전송 불가', message: violation, type: 'warning' });
      return;
    }

    showAlert({
      title: '송장전송',
      message: `선택한 ${selectedOrders.length}건의 송장을 쇼핑몰로 전송하시겠습니까?`,
      showCancel: true,
      onConfirm: () => sendInvoices([...selectedOrders]),
    });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedOrders.length}</span>건
      </span>

      <Select value={targetStatus} onValueChange={setTargetStatus}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="주문 상태 선택" />
        </SelectTrigger>
        <SelectContent>
          {USER_SELECTABLE_ORDER_STATUS.map((status) => (
            <SelectItem key={status.id} value={status.id}>
              {status.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={handleBulkStatusChange} disabled={isRunning}>
        주문상태 일괄변경
      </Button>

      <Button variant="outline" size="sm" onClick={handleBulkConfirm} disabled={isRunning}>
        발주확인 일괄변경
      </Button>

      <Button variant="outline" size="sm" onClick={handleInvoiceSend} disabled={isRunning}>
        송장전송
      </Button>
    </div>
  );
};
