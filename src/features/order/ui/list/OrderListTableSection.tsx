import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { OrderListTableHeader } from './components/orderTable/OrderListTableHeader';
import { MOCK_ORDERS_DATA } from '@/mocks/data/MockOrdersData';
import { OrderListTable } from './components/orderTable/OrderListTable';

export const OrderListTableSection = () => {
  return (
    <Card>
      <CardHeader>
        <OrderListTableHeader total={MOCK_ORDERS_DATA.length} />
      </CardHeader>
      <CardContent>
        <OrderListTable />
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
  );
};
