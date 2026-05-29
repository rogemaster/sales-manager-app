'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { currentPageAtom, selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { useGetUsers } from '@/features/account/api/useGetUsers';
import { UserTable } from './components/UserTable';

export const UserTableSection = () => {
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const { data, isLoading } = useGetUsers();
  const setSelectedUsers = useSetAtom(selectedUsersAtom);

  useEffect(() => {
    setSelectedUsers([]);
  }, [data, setSelectedUsers]);

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>총 {isLoading ? '-' : total}명의 사용자</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">불러오는 중...</div>
        ) : (
          <UserTable users={users} />
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
