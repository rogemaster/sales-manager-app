'use client';

import { useAtom } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedAccountIdsAtom } from '@/features/order/store/collect.store';
import { useCollectingAccountIds } from '@/features/order/api/useRunOrderCollection';
import { useGetCollectionAccounts } from '@/features/order/api/useGetCollectionAccounts';
import { CollectionStatusCell } from './components/CollectionStatusCell';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';

const HEADERS = ['쇼핑몰명', '아이디', '수집상태', '수집기간', '수집자', '최종수집일자'];

export const CollectionTableSection = () => {
  const { data: accounts = [] } = useGetCollectionAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useAtom(selectedAccountIdsAtom);
  const collectingAccountIds = useCollectingAccountIds();

  const allIds = accounts.map((account) => account.accountId);
  const isAllChecked = allIds.length > 0 && allIds.every((id) => selectedAccountIds.includes(id));
  const isIndeterminate = selectedAccountIds.some((id) => allIds.includes(id)) && !isAllChecked;

  const handleToggleAll = (checked: boolean) => {
    setSelectedAccountIds(checked ? allIds : []);
  };

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedAccountIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
            <TableHead className="w-10">
              <Checkbox
                checked={isIndeterminate ? 'indeterminate' : isAllChecked}
                onCheckedChange={(checked) => handleToggleAll(!!checked)}
              />
            </TableHead>
            {HEADERS.map((header) => (
              <TableHead key={header} className="text-center font-bold uppercase tracking-widest">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={HEADERS.length + 1} className="py-8 text-center text-muted-foreground">
                수집할 쇼핑몰계정이 없습니다. 쇼핑몰계정을 등록하거나 검색 조건을 바꿔 주세요.
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((account) => (
              <TableRow
                key={account.accountId}
                data-state={selectedAccountIds.includes(account.accountId) ? 'selected' : undefined}
                className="group border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedAccountIds.includes(account.accountId)}
                    onCheckedChange={(checked) => handleToggleRow(account.accountId, !!checked)}
                  />
                </TableCell>
                <TableCell className="text-center">{getShoppingMallName(account.mallCode)}</TableCell>
                <TableCell className="text-center">{account.mallId}</TableCell>
                <TableCell className="text-center">
                  <CollectionStatusCell
                    status={collectingAccountIds.includes(account.accountId) ? 'COLLECTING' : account.status}
                    newCount={account.newCount}
                    duplicateCount={account.duplicateCount}
                    errorMessage={account.errorMessage}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {account.periodStart && account.periodEnd ? `${account.periodStart} ~ ${account.periodEnd}` : '-'}
                </TableCell>
                <TableCell className="text-center" title={account.collectedByEmail ?? undefined}>
                  {account.collectedByName ?? '-'}
                </TableCell>
                <TableCell className="text-center">{account.collectedAt ?? '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
