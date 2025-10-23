'use client';

import * as React from 'react';

import { OrderListHeaderSection, OrderListSearchFilterSection, OrderListTableSection } from '@/features/order/ui/list';
import { Badge } from '@/components/ui/badge';

export function OrderListLayout({ onNavigate }: OrderListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '주문확인':
        return <Badge variant="secondary">주문확인</Badge>;
      case '배송준비중':
        return (
          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
            배송준비중
          </Badge>
        );
      case '배송중':
        return (
          <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
            배송중
          </Badge>
        );
      case '배송완료':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            배송완료
          </Badge>
        );
      case '취소':
        return <Badge variant="destructive">취소</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      {/* 헤더 */}
      <OrderListHeaderSection />

      {/* 검색 및 필터 */}
      <OrderListSearchFilterSection />

      {/* 주문 목록 테이블 */}
      <OrderListTableSection />
    </>
  );
}
