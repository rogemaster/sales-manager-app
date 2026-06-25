'use client';

import { useAtom } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedUsersAtom } from '@/features/account/store/userSearch.store';
import { USER_TABLE_HEAD, USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { AccountUser } from '@/features/account/types/user.types';

const gradeLabel = (grade: string) => USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

interface UserTableProps {
  users: AccountUser[];
}

export const UserTable = ({ users }: UserTableProps) => {
  const [selectedUsers, setSelectedUsers] = useAtom(selectedUsersAtom);

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
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={users.length > 0 && selectedUsers.length === users.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {USER_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center font-bold uppercase tracking-widest">
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={USER_TABLE_HEAD.length + 1} className="h-40 text-center text-muted-foreground text-sm">
              조건에 맞는 사용자가 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id} className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30">
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
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
