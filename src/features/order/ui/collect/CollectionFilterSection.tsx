'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollectionDateFilter } from './components/CollectionDateFilter';
import { CollectionMallFilter } from './components/CollectionMallFilter';
import { CollectionSearchInput } from './components/CollectionSearchInput';

/** 검색 버튼은 검색어 행(CollectionSearchInput)에 있다 — 검색 필터 섹션 공통 배치(ui-conventions). */
export const CollectionFilterSection = () => {
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
          <div className="px-6 py-1">
            <CollectionDateFilter />
          </div>
          <div className="px-6 py-1">
            <CollectionMallFilter />
          </div>
          <div className="px-6 py-1">
            <CollectionSearchInput />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
