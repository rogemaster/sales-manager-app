'use client';

import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';

import { getHomeStats } from '@/features/home/api/getHomeStats';
import { getHomeOrderStats } from '@/features/home/api/getHomeOrderStats';
import { getRecentProducts } from '@/features/home/api/getRecentProducts';
import { ClaimStatCards } from './components/ClaimStatCards';
import { InquiryStatCards } from './components/InquiryStatCards';
import { OrderStatCards } from './components/OrderStatCards';
import { QuickActions } from './components/QuickActions';
import { RecentProducts } from './components/RecentProducts';
import { StatCards } from './components/StatCards';

export const HomeLayout = () => {
  const endDate = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

  const { data: stats } = useQuery({
    queryKey: ['home', 'stats'],
    queryFn: getHomeStats,
  });

  const { data: orderStats } = useQuery({
    queryKey: ['home', 'order-stats', startDate, endDate],
    queryFn: () => getHomeOrderStats(startDate, endDate),
  });

  const { data: recentProducts = [] } = useQuery({
    queryKey: ['home', 'recent-products'],
    queryFn: getRecentProducts,
  });

  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-tight">업무 현황</h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            최근 7일
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {stats && <StatCards stats={stats} />}
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
