'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollectionDateFilter } from './components/CollectionDateFilter';
import { CollectionMallFilter } from './components/CollectionMallFilter';
import {
  collectStartDateAtom,
  collectEndDateAtom,
  collectMallAtom,
  collectMallAccountIdAtom,
  collectSearchParamsAtom,
  selectedJobIdsAtom,
} from '@/features/order/store/collect.store';

export const CollectionFilterSection = () => {
  const startDate = useAtomValue(collectStartDateAtom);
  const endDate = useAtomValue(collectEndDateAtom);
  const mallCode = useAtomValue(collectMallAtom);
  const mallAccountId = useAtomValue(collectMallAccountIdAtom);
  const setSearchParams = useSetAtom(collectSearchParamsAtom);
  const setSelectedJobIds = useSetAtom(selectedJobIdsAtom);

  const handleSearch = () => {
    setSelectedJobIds([]);
    setSearchParams({ startDate, endDate, mallCode, mallAccountId });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="px-6 py-1"><CollectionDateFilter /></div>
          <div className="flex items-center justify-between px-6 py-1">
            <CollectionMallFilter />
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
