'use client';

import dayjs from 'dayjs';
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getHomeStats } from '@/features/home/api/getHomeStats';
import { getHomeLinkedProductStats } from '@/features/home/api/getHomeLinkedProductStats';
import { getHomeOrderStats } from '@/features/home/api/getHomeOrderStats';
import { getRecentProducts } from '@/features/home/api/getRecentProducts';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { calculatorRangeDate } from '@/lib/utils';
import { ClaimStatCards } from './components/ClaimStatCards';
import { InquiryStatCards } from './components/InquiryStatCards';
import { LinkedProductStatCards } from './components/LinkedProductStatCards';
import { OrderStatCards } from './components/OrderStatCards';
import { QuickActions } from './components/QuickActions';
import { RecentProducts } from './components/RecentProducts';
import { StatCards } from './components/StatCards';

const PERIOD_OPTIONS = [7, 15, 30] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

// 목록 화면의 기간 버튼(DatePickerRangeButton)과 같은 기준으로 자른다 — "7일"은 오늘부터 7일 전까지다.
const toDateRange = (period: Period) => {
  const [start, end] = calculatorRangeDate({ range: period, uniq: 'day' });
  return { startDate: dayjs(start).format('YYYY-MM-DD'), endDate: dayjs(end).format('YYYY-MM-DD') };
};

export const HomeLayout = () => {
  const [period, setPeriod] = useState<Period>(7);
  const { startDate, endDate } = toDateRange(period);
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: stats } = useQuery({
    queryKey: ['home', 'stats', workspaceOwnerId, startDate, endDate],
    queryFn: () => getHomeStats(startDate, endDate),
    enabled: !!workspaceOwnerId,
    // 기간을 바꾸는 동안 이전 숫자를 유지한다 — 없으면 줄이 사라졌다 다시 나타난다.
    placeholderData: keepPreviousData,
  });

  const { data: linkedProductStats } = useQuery({
    queryKey: ['home', 'linked-product-stats', workspaceOwnerId, startDate, endDate],
    queryFn: () => getHomeLinkedProductStats(startDate, endDate),
    enabled: !!workspaceOwnerId,
    placeholderData: keepPreviousData,
  });

  const { data: orderStats } = useQuery({
    queryKey: ['home', 'order-stats', workspaceOwnerId, startDate, endDate],
    queryFn: () => getHomeOrderStats(workspaceOwnerId, startDate, endDate),
    enabled: !!workspaceOwnerId,
    placeholderData: keepPreviousData,
  });

  const { data: recentProducts } = useQuery({
    queryKey: ['home', 'recent-products', workspaceOwnerId],
    queryFn: () => getRecentProducts(workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-tight">업무 현황</h2>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(period)}
            // 선택된 버튼을 다시 누르면 Radix가 ''를 넘긴다 — 무시해 항상 하나가 선택돼 있게 한다.
            onValueChange={(value) => value && setPeriod(Number(value) as Period)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleGroupItem key={option} value={String(option)} className="px-3 text-xs">
                {option}일
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-1">
          {stats && <StatCards stats={stats} />}
          {linkedProductStats && <LinkedProductStatCards stats={linkedProductStats} />}
          {orderStats && <OrderStatCards stats={orderStats} />}
          {orderStats && <ClaimStatCards stats={orderStats} />}
          <InquiryStatCards />
        </div>
      </div>
      <QuickActions />
      <RecentProducts products={recentProducts} />
    </div>
  );
};
