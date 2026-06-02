'use client';

import { useAtom } from 'jotai';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { selectedJobIdsAtom } from '@/features/order/store/collect.store';
import { useGetCollectionJobs } from '@/features/order/api/useGetCollectionJobs';
import { CollectionStatusCell } from './components/CollectionStatusCell';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

const getMallName = (mallCode: string): string =>
  SHOPPING_MALLS.find((m) => m.code === mallCode)?.name ?? mallCode;

export const CollectionTableSection = () => {
  const { data: jobs = [] } = useGetCollectionJobs();
  const [selectedJobIds, setSelectedJobIds] = useAtom(selectedJobIdsAtom);

  const allIds = jobs.map((j) => j.id);
  const isAllChecked = allIds.length > 0 && allIds.every((id) => selectedJobIds.includes(id));
  const isIndeterminate = selectedJobIds.some((id) => allIds.includes(id)) && !isAllChecked;

  const handleToggleAll = (checked: boolean) => {
    setSelectedJobIds(checked ? allIds : []);
  };

  const handleToggleRow = (id: string, checked: boolean) => {
    setSelectedJobIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)));
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
            <TableHead className="text-center font-bold uppercase tracking-widest">쇼핑몰명</TableHead>
            <TableHead className="text-center font-bold uppercase tracking-widest">아이디</TableHead>
            <TableHead className="text-center font-bold uppercase tracking-widest">수집상태</TableHead>
            <TableHead className="text-center font-bold uppercase tracking-widest">작업ID</TableHead>
            <TableHead className="text-center font-bold uppercase tracking-widest">최종수집일자</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                검색 조건을 선택한 후 검색 버튼을 눌러주세요.
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow
                key={job.id}
                data-state={selectedJobIds.includes(job.id) ? 'selected' : undefined}
                className="group border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"
              >
                <TableCell>
                  <Checkbox
                    checked={selectedJobIds.includes(job.id)}
                    onCheckedChange={(checked) => handleToggleRow(job.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="text-center">{getMallName(job.mallName)}</TableCell>
                <TableCell className="text-center">{job.mallAccountId}</TableCell>
                <TableCell className="text-center">
                  <CollectionStatusCell
                    status={job.status}
                    collectedCount={job.collectedCount}
                    totalCount={job.totalCount}
                  />
                </TableCell>
                <TableCell className="text-center">{job.id}</TableCell>
                <TableCell className="text-center">{job.lastCollectedAt ?? '-'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
