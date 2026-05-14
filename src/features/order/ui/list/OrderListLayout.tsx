'use client';

import * as React from 'react';

import { OrderListHeaderSection, OrderListSearchFilterSection, OrderListTableSection } from '@/features/order/ui/list';

export const OrderListLayout = () => {
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
};
