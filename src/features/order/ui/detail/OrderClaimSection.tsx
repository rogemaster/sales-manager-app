'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { OrderClaim, OrderDetail } from '../../types/order.types';

const CLAIM_TYPE_LABEL: Record<string, string> = {
  CANCEL: '취소',
  EXCHANGE: '교환',
  RETURN: '반품',
};

type Props = {
  claim?: OrderClaim | null;
  isEditMode: boolean;
};

export const OrderClaimSection = ({ claim, isEditMode }: Props) => {
  const { control } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>클레임</CardTitle>
      </CardHeader>
      <CardContent>
        {!claim ? (
          <p className="text-sm text-muted-foreground">클레임 없음</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">쇼핑몰 클레임 정보</p>
              <div className="bg-muted rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">유형</span>
                  <Badge variant="outline">{CLAIM_TYPE_LABEL[claim.claimType]}</Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">메시지</span>
                  <p className="text-sm mt-1">{claim.claimMessage}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">담당자 처리 내용</p>
              {isEditMode ? (
                <Controller
                  control={control}
                  name="claim.handlerNote"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="처리 내용을 입력하세요"
                      rows={3}
                    />
                  )}
                />
              ) : (
                <p className="text-sm">{claim.handlerNote || '-'}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
