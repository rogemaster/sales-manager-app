'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { getOrder } from '../../api/getOrder';
import { getOrderClaim } from '../../api/getOrderClaim';
import { getOrderComments } from '../../api/getOrderComments';
import { getOrderHistory } from '../../api/getOrderHistory';
import { updateOrder } from '../../api/updateOrder';
import { OrderDetail } from '../../types/order.types';
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

  const { data: order, isSuccess: orderSuccess } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });

  const { data: claim, isSuccess: claimSuccess } = useQuery({
    queryKey: ['order-claim', orderId],
    queryFn: () => getOrderClaim(orderId),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['order-comments', orderId],
    queryFn: () => getOrderComments(orderId),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', orderId],
    queryFn: () => getOrderHistory(orderId),
  });

  useEffect(() => {
    if (orderSuccess && order) {
      form.reset({ ...order, claim: claim ?? undefined });
    }
  }, [orderSuccess, claimSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: saveOrder, isPending } = useMutation({
    mutationFn: (data: OrderDetail) => updateOrder(orderId, data),
    onSuccess: (updatedOrder) => {
      form.reset({ ...updatedOrder, claim: claim ?? undefined });
      queryClient.setQueryData(['order', orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId] });
      setIsEditMode(false);
      showAlert({ type: 'success', message: '주문 수정 완료' });
    },
    onError: () => {
      showAlert({ type: 'error', message: '주문 수정 실패' });
    },
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
        <form onSubmit={form.handleSubmit((data) => saveOrder(data))} className="space-y-6">
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

          <OrderInfoSection order={order} isEditMode={isEditMode} />
          <OrdererRecipientSection order={order} isEditMode={isEditMode} />
          <OrderStatusSection order={order} isEditMode={isEditMode} />
          <OrderClaimSection claim={claim} isEditMode={isEditMode} />
        </form>
      </FormProvider>

      <div className="space-y-6 mt-6">
        <OrderCommentSection orderId={orderId} comments={comments} />
        <OrderEditHistorySection editHistory={history} />
      </div>
    </>
  );
};
