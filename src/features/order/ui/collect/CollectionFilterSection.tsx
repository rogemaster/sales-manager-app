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
    <Card>
      <CardHeader>
        <CardTitle>검색 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <CollectionDateFilter />
          <div className="flex items-center justify-between">
            <CollectionMallFilter />
            <Button onClick={handleSearch}>검색</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
