'use client';

import * as React from 'react';
import { Search, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { MOCK_ORDERS_DATA } from '@/mocks/data/MockOrdersData';
import { OrderListSearchFilterSection } from './OrderListSearchFilterSection';

interface OrderListProps {
  onNavigate: (page: string, orderId?: number) => void;
}

export function OrderListLayout({ onNavigate }: OrderListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [orders, setOrders] = React.useState(MOCK_ORDERS_DATA);

  // 상태 추가
  const [selectedOrders, setSelectedOrders] = React.useState<number[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.status.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 체크박스 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

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

  const pageNumbers = React.useMemo(() => {
    const pages: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('ellipsis-start');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let p = start; p <= end; p++) pages.push(p);
      if (currentPage < totalPages - 3) pages.push('ellipsis-end');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">주문 목록</h1>
          <p className="text-muted-foreground">수집된 주문을 관리하세요.</p>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <OrderListSearchFilterSection />

      {/* 주문 목록 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>주문 목록</CardTitle>
            <CardDescription>총 {filteredOrders.length}개의 주문</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-32">주문번호</TableHead>
                <TableHead>주문명</TableHead>
                <TableHead>주문상태</TableHead>
                <TableHead>주문금액</TableHead>
                <TableHead>배송비</TableHead>
                <TableHead>주문수집일</TableHead>
                <TableHead>주문수정일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{order.orderNumber}</TableCell>
                  <TableCell className="font-medium">{order.orderName}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{order.totalAmount.toLocaleString()}원</TableCell>
                  <TableCell>{order.shippingFee === 0 ? '무료' : `${order.shippingFee.toLocaleString()}원`}</TableCell>
                  <TableCell>{order.collectedAt}</TableCell>
                  <TableCell>{order.modifiedAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onNavigate('order-edit', order.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t">
            <div className="flex items-center gap-6">
              <div className="text-sm text-muted-foreground">
                총 <span className="font-medium text-foreground">{filteredOrders.length}</span>개 중{' '}
                <span className="font-medium text-foreground">
                  {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)}
                </span>
                개 표시
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{currentPage}</span> / {totalPages} 페이지
              </div>
            </div>

            <Pagination>
              <PaginationContent>
                {/* 처음 */}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    aria-label="처음"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage !== 1) setCurrentPage(1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  >
                    처음
                  </PaginationLink>
                </PaginationItem>

                {/* 이전 */}
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-label="이전"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage((prev) => Math.max(prev - 1, 1));
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {/* 페이지 번호 + Ellipsis */}
                {pageNumbers.map((item, idx) =>
                  typeof item === 'number' ? (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(item);
                        }}
                        isActive={currentPage === item}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`${item}-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ),
                )}

                {/* 다음 */}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-label="다음"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {/* 마지막 */}
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    aria-label="마지막"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage !== totalPages) setCurrentPage(totalPages);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  >
                    마지막
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
