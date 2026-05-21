'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectedOrdersAtom } from '@/features/order/store/search.store';
import { useGetOrders } from '@/features/order/api/useGetOrders';
import { useBulkUpdateOrderStatus } from '@/features/order/api/useBulkUpdateOrderStatus';
import { useAlert } from '@/hooks/useAlert';
import { ORDER_STATUS } from '@/features/order/constant/status.constants';
import { OrderStatusTypes } from '@/features/order/types/order.types';

const NON_CHANGEABLE_STATUSES: OrderStatusTypes[] = [
  'INVOICE_REGISTER',
  'INVOICE_COMPLETE',
  'COMPLETE_CANCEL',
  'COMPLETE_EXCHANGE',
  'COMPLETE_RETURN',
];

const NON_CHANGEABLE_STATUS_NAMES = '송장등록, 송장전송완료, 취소완료, 교환완료, 반품완료';

export const OrderListActionSection = () => {
  const [selectedOrders, setSelectedOrders] = useAtom(selectedOrdersAtom);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const { data } = useGetOrders();
  const { mutate: bulkUpdate, isPending } = useBulkUpdateOrderStatus();
  const { showAlert } = useAlert();

  const orders = data?.orders ?? [];

  const handleBulkStatusChange = () => {
    if (selectedOrders.length === 0) {
      showAlert({ message: '변경할 주문을 선택해주세요.', type: 'warning' });
      return;
    }
    if (!targetStatus) {
      showAlert({ message: '변경할 주문 상태를 선택해주세요.', type: 'warning' });
      return;
    }

    const selectedOrderObjects = orders.filter((o) => selectedOrders.includes(o.orderNumber));
    const nonChangeableOrders = selectedOrderObjects.filter((o) => NON_CHANGEABLE_STATUSES.includes(o.orderStatus));

    if (nonChangeableOrders.length > 0) {
      showAlert({
        title: '상태 변경 불가',
        message: `${NON_CHANGEABLE_STATUS_NAMES} 상태인 주문(${nonChangeableOrders.length}건)은 상태를 변경할 수 없습니다.`,
        type: 'warning',
      });
      return;
    }

    const snapshotIds = [...selectedOrders];
    const count = snapshotIds.length;

    showAlert({
      title: '주문상태 일괄변경',
      message: `선택한 ${count}건의 주문 상태를 변경하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        bulkUpdate(
          { orderNumbers: snapshotIds, orderStatus: targetStatus as OrderStatusTypes },
          {
            onSuccess: () => {
              setSelectedOrders([]);
              showAlert({ message: `${count}건의 주문 상태가 변경되었습니다.`, type: 'success' });
            },
          },
        );
      },
    });
  };

  const handleBulkConfirm = () => {
    if (selectedOrders.length === 0) {
      showAlert({ message: '변경할 주문을 선택해주세요.', type: 'warning' });
      return;
    }

    const selectedOrderObjects = orders.filter((o) => selectedOrders.includes(o.orderNumber));
    const nonNewOrders = selectedOrderObjects.filter((o) => o.orderStatus !== 'NEW_ORDER');

    if (nonNewOrders.length > 0) {
      showAlert({
        title: '발주확인 변경 불가',
        message: '신규주문 상태인 주문건만 발주확인으로 변경할 수 있습니다.',
        type: 'warning',
      });
      return;
    }

    const snapshotIds = [...selectedOrders];
    const count = snapshotIds.length;

    showAlert({
      title: '발주확인 일괄변경',
      message: `선택한 ${count}건을 발주확인으로 변경하시겠습니까?`,
      showCancel: true,
      onConfirm: () => {
        bulkUpdate(
          { orderNumbers: snapshotIds, orderStatus: 'CONFIRMED_ORDER' },
          {
            onSuccess: () => {
              setSelectedOrders([]);
              showAlert({ message: `${count}건이 발주확인으로 변경되었습니다.`, type: 'success' });
            },
          },
        );
      },
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
          {ORDER_STATUS.map((status) => (
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
