'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom, selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { useGetShoppingAccounts } from '@/features/shoppingAccount/api/useGetShoppingAccounts';
import { ShoppingAccountTable } from './components/ShoppingAccountTable';

export const ShoppingAccountTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetShoppingAccounts();
  const setSelectedAccounts = useSetAtom(selectedAccountsAtom);

  useEffect(() => {
    setSelectedAccounts([]);
  }, [data, setSelectedAccounts]);

  const accounts = data?.accounts ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">계정 목록</CardTitle>
          </div>
          <CardDescription>총 {isLoading ? '-' : total}개의 계정</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
        ) : (
          <ShoppingAccountTable accounts={accounts} />
        )}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChangePage={(page) => setCurrentPage(page)}
        />
      </CardContent>
    </Card>
  );
};
