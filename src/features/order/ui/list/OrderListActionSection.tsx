'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectedOrdersAtom } from '@/features/order/store/search.store';
import { useGetOrders } from '@/features/order/api/useGetOrders';
import { useBulkUpdateOrderStatus } from '@/features/order/api/useBulkUpdateOrderStatus';
import { useAlert } from '@/hooks/useAlert';
import { findOrderStatusChangeViolation, USER_SELECTABLE_ORDER_STATUS } from '@/features/order/util/orderStatusRule';
import { OrderStatusTypes } from '@/features/order/types/order.types';
import { buildBulkResultAlert } from '@/shared/utils/bulkResultAlert';

export const OrderListActionSection = () => {
  const [selectedOrders, setSelectedOrders] = useAtom(selectedOrdersAtom);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const { data } = useGetOrders();
  const { mutate: bulkUpdate, isPending } = useBulkUpdateOrderStatus();
  const { showAlert } = useAlert();

  const orders = data?.orders ?? [];

  // 서버(POST /api/orders/status)와 같은 규칙으로 미리 막는다. 서버도 같은 함수로 한 번 더 거른다.
  const findSelectionViolation = (next: OrderStatusTypes) =>
    orders
      .filter((o) => selectedOrders.includes(o.orderNumber))
      .map((o) => findOrderStatusChangeViolation(o.orderStatus, next))
      .find((message) => message !== null);

  const runBulkUpdate = (orderStatus: OrderStatusTypes) => {
    const snapshotIds = [...selectedOrders];
    bulkUpdate(
      { orderNumbers: snapshotIds, orderStatus },
      {
        onSuccess: ({ successCount, failures }) => {
          setSelectedOrders([]);
          showAlert(buildBulkResultAlert('변경', successCount, failures));
        },
        onError: (error) => showAlert({ type: 'error', message: error.message }),
      },
    );
  };

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

      <Button variant="outline" size="sm" onClick={handleBulkStatusChange} disabled={isPending}>
        주문상태 일괄변경
      </Button>

      <Button variant="outline" size="sm" onClick={handleBulkConfirm} disabled={isPending}>
        발주확인 일괄변경
      </Button>
    </div>
  );
};
