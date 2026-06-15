'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedAccountsAtom } from '@/features/shoppingAccount/store/search.store';
import { SHOPPING_ACCOUNT_TABLE_HEAD } from '@/features/shoppingAccount/constant/shoppingAccount.constants';
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

const getMallName = (code: string) => SHOPPING_MALLS.find((m) => m.code === code)?.name ?? code;

interface ShoppingAccountTableProps {
  accounts: ShoppingAccount[];
}

export const ShoppingAccountTable = ({ accounts }: ShoppingAccountTableProps) => {
  const [selectedAccounts, setSelectedAccounts] = useAtom(selectedAccountsAtom);
  const router = useRouter();

  const handleSelectAccount = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAccounts((prev) => [...prev, id]);
    } else {
      setSelectedAccounts((prev) => prev.filter((v) => v !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccounts(accounts.map((a) => a.id));
    } else {
      setSelectedAccounts([]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
          <TableHead className="w-12">
            <Checkbox
              checked={accounts.length > 0 && selectedAccounts.length === accounts.length}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          {SHOPPING_ACCOUNT_TABLE_HEAD.map((item) => (
            <TableHead key={item.id} className="text-center font-bold uppercase tracking-widest">
              {item.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={SHOPPING_ACCOUNT_TABLE_HEAD.length + 1}
              className="h-40 text-center text-muted-foreground text-sm"
            >
              조건에 맞는 계정이 없습니다.
            </TableCell>
          </TableRow>
        ) : (
          accounts.map((account) => (
            <TableRow
              key={account.id}
              className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30 cursor-pointer"
              onClick={() => router.push(`/shopping/accounts/${account.id}`)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedAccounts.includes(account.id)}
                  onCheckedChange={(checked: boolean) => handleSelectAccount(account.id, checked)}
                />
              </TableCell>
              <TableCell className="text-center">{getMallName(account.mallCode)}</TableCell>
              <TableCell className="text-left">{account.nickname || '-'}</TableCell>
              <TableCell className="text-center">
                <Badge variant={account.isActive ? 'default' : 'secondary'}>
                  {account.isActive ? '사용' : '미사용'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{account.createdAt}</TableCell>
              <TableCell className="text-center">{account.updatedAt}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
