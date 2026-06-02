'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OrderEditHistory } from '../../types/order.types';

const FIELD_LABEL_MAP: Record<string, string> = {
  orderProductName: '주문상품명',
  orderPrice: '주문금액',
  orderTotalQuantity: '주문수량',
  orderDeliveryType: '배송타입',
  orderDeliveryPrice: '배송비',
  orderStatus: '주문상태',
  orderName: '주문자명',
  orderPhoneNumber: '주문자 연락처',
  orderZipCode: '주문자 우편번호',
  orderAddress: '주문자 주소',
  orderDetailAddress: '주문자 상세주소',
  payeeName: '수취인명',
  payeePhoneNumber: '수취인 연락처',
  payeeZipCode: '수취인 우편번호',
  payeeAddress: '수취인 주소',
  payeeDetailAddress: '수취인 상세주소',
  deliveryMessage: '배송메시지',
  deliveryCompany: '택배사',
  invoiceNumber: '송장번호',
  'claim.handlerNote': '담당자 처리내용',
};

const toFieldLabel = (field: string) => FIELD_LABEL_MAP[field] ?? field;

type Props = {
  editHistory: OrderEditHistory[];
};

export const OrderEditHistorySection = ({ editHistory }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (editHistory.length === 0) return null;

  const latest = editHistory[editHistory.length - 1];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">수정이력</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            수정이력 전체보기
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            <span className="text-muted-foreground">최종 수정: </span>
            <span className="font-medium">{latest.modifiedAt}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">수정자: </span>
            <span className="font-medium">{latest.modifiedBy}</span>
          </p>
        </div>
        {isExpanded && (
          <div className="space-y-2 border-t pt-3">
            {editHistory.map((history) => (
              <div key={history.id} className="text-sm border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{history.modifiedAt}</span>
                  <span className="font-medium">{history.modifiedBy}</span>
                </div>
                {history.changedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    변경 항목: {history.changedFields.map(toFieldLabel).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
