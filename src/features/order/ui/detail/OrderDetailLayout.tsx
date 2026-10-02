'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getOrder } from '../../api/getOrder';
import { getOrderClaim } from '../../api/getOrderClaim';
import { getOrderComments } from '../../api/getOrderComments';
import { getOrderHistory } from '../../api/getOrderHistory';
import { updateOrder } from '../../api/updateOrder';
import { Order, OrderDetail } from '../../types/order.types';
import { orderWriteSchema, OrderWriteValues } from '../../util/orderWrite';
import { ORDER_LIST_QUERY_KEY } from '../../api/useGetOrders';
import { OrderInfoSection } from './OrderInfoSection';
import { OrdererRecipientSection } from './OrdererRecipientSection';
import { OrderStatusSection } from './OrderStatusSection';
import { OrderClaimSection } from './OrderClaimSection';
import { OrderCommentSection } from './OrderCommentSection';
import { OrderEditHistorySection } from './OrderEditHistorySection';

type Props = {
  orderId: string;
};

export const OrderDetailLayout = ({ orderId }: Props) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const form = useForm<OrderDetail>();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: order, isSuccess: orderSuccess } = useQuery({
    queryKey: ['order', orderId, workspaceOwnerId],
    queryFn: () => getOrder(orderId),
    enabled: !!workspaceOwnerId,
  });

  const { data: claim, isSuccess: claimSuccess } = useQuery({
    queryKey: ['order-claim', orderId, workspaceOwnerId],
    queryFn: () => getOrderClaim(orderId),
    enabled: !!workspaceOwnerId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['order-comments', orderId, workspaceOwnerId],
    queryFn: () => getOrderComments(orderId),
    enabled: !!workspaceOwnerId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', orderId, workspaceOwnerId],
    queryFn: () => getOrderHistory(orderId),
    enabled: !!workspaceOwnerId,
  });

  useEffect(() => {
    if (orderSuccess && order) {
      form.reset({ ...order, claim: claim ?? undefined });
    }
  }, [orderSuccess, claimSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: saveOrder, isPending } = useMutation({
    mutationFn: (values: OrderWriteValues) => updateOrder(orderId, values),
    onSuccess: (updatedOrder: Order, values) => {
      // 클레임 메모는 같은 요청으로 저장됐다 — 다시 조회하지 않고 보낸 값으로 맞춘다.
      const updatedClaim = claim ? { ...claim, handlerNote: values.claim?.handlerNote ?? claim.handlerNote } : claim;
      form.reset({ ...updatedOrder, claim: updatedClaim ?? undefined });
      queryClient.setQueryData(['order', orderId, workspaceOwnerId], updatedOrder);
      queryClient.setQueryData(['order-claim', orderId, workspaceOwnerId], updatedClaim);
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId, workspaceOwnerId] });
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
      setIsEditMode(false);
      showAlert({ type: 'success', message: '주문 수정 완료' });
    },
    onError: (error) => {
      showAlert({ type: 'error', message: error.message });
      // 발주확인이 몰에서 거절되면 저장은 안 됐지만 실패 사유·이력은 기록됐다 — 바로 보이게 다시 읽는다.
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId, workspaceOwnerId] });
      queryClient.invalidateQueries({ queryKey: [ORDER_LIST_QUERY_KEY] });
    },
  });

  // 폼 타입(OrderDetail)과 쓰기 스키마 입력 타입이 달라 resolver 대신 제출 시 같은 스키마로 검사한다.
  const handleSave = form.handleSubmit((data) => {
    const parsed = orderWriteSchema.safeParse(data);
    if (!parsed.success) {
      showAlert({ type: 'warning', message: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' });
      return;
    }
    // 연 시점 상태를 함께 보내 "상태를 안 건드린 저장"이 다른 사용자의 상태 변경을 되돌리지 않게 한다.
    saveOrder({ ...parsed.data, baseStatus: order?.orderStatus });
  });

  const handleCancel = () => {
    if (order) form.reset({ ...order, claim: claim ?? undefined });
    setIsEditMode(false);
  };

  if (!order) return null;

  return (
    <>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" />
      <FormProvider {...form}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">주문 상세</h1>
              <p className="text-muted-foreground">{order.orderNumber}</p>
            </div>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" type="button" onClick={handleCancel}>
                    취소
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    저장
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditMode(true)}>
                  수정
                </Button>
              )}
            </div>
          </div>

          <OrderInfoSection order={order} />
          <OrdererRecipientSection order={order} isEditMode={isEditMode} />
          <OrderStatusSection order={order} isEditMode={isEditMode} />
          <OrderClaimSection claim={claim} isEditMode={isEditMode} />
        </form>
      </FormProvider>

      <div className="space-y-6 mt-6">
        <OrderCommentSection orderId={orderId} comments={comments} ownerId={workspaceOwnerId} />
        <OrderEditHistorySection editHistory={history} />
      </div>
    </>
  );
};
