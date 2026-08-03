'use client';

import { ReactNode } from 'react';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

type Props = {
  linked: MallLinkedProduct;
};

const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="break-all">{children}</span>
  </div>
);

/**
 * 연동 데이터의 불변 식별 정보를 보여주는 읽기 전용 카드.
 * 수정 폼 바깥에 두는 이유는 이 값들이 폼으로 흘러들어가면 원본 추적 정보까지 수정 대상이 되기 때문이다.
 */
export const MallLinkedProductInfoCard = ({ linked }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">연동 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 sm:grid-cols-3 lg:grid-cols-5">
        <InfoRow label="상품코드">{linked.sourceProductId}</InfoRow>
        <InfoRow label="쇼핑몰상품코드">{linked.externalProductId ?? '-'}</InfoRow>
        <InfoRow label="연동상태">
          <Badge variant={linked.status === 'success' ? 'default' : 'destructive'}>
            {linked.status === 'success' ? '성공' : '실패'}
          </Badge>
        </InfoRow>
        <InfoRow label="최종연동일시">{dayjs(linked.lastSentAt).format('YYYY-MM-DD HH:mm')}</InfoRow>
        <InfoRow label="등록자">{linked.createdByEmail}</InfoRow>
      </CardContent>
    </Card>
  );
};
