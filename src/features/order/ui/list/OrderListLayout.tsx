'use client';

import * as React from 'react';

import { OrderListHeaderSection, OrderListSearchFilterSection, OrderListTableSection, OrderListActionSection } from '@/features/order/ui/list';

export const OrderListLayout = () => {
  return (
    <>
      {/* 헤더 */}
      <OrderListHeaderSection />

      {/* 검색 및 필터 */}
      <OrderListSearchFilterSection />

      {/* 일괄 작업 */}
      <OrderListActionSection />

      {/* 주문 목록 테이블 */}
      <OrderListTableSection />
    </>
  );
};
