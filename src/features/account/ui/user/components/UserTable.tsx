'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit } from 'lucide-react';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { USER_TABLE_HEAD, USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { AccountUser } from '@/features/account/types/user.types';

const gradeLabel = (grade: string) => USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

interface UserTableProps {
  users: AccountUser[];
}

export const UserTable = ({ users }: UserTableProps) => {
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);
  const router = useRouter();

  const handleSelectUser = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, id]);
    } else {
      setSelectedUsers((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={users.length > 0 && selectedUsers.length === users.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {USER_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center">
              {item.title}
            </TableHead>
          ))}
          <TableHead className="text-center">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={USER_TABLE_HEAD.length + 2} className="h-40 text-center text-muted-foreground text-sm">
              조건에 맞는 사용자가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={(checked: boolean) => handleSelectUser(user.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{gradeLabel(user.grade)}</TableCell>
              <TableCell className="text-center">{user.email}</TableCell>
              <TableCell className="text-center">{user.name}</TableCell>
              <TableCell className="text-center">{user.createdAt}</TableCell>
              <TableCell className="text-center">{user.updatedAt}</TableCell>
              <TableCell className="text-center">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/account/user/${user.id}`)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
