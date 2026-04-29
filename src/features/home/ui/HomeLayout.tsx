'use client';

import { useQuery } from '@tanstack/react-query';

import { getHomeStats } from '@/features/home/api/getHomeStats';
import { getRecentProducts } from '@/features/home/api/getRecentProducts';
import { ProductStatusChart } from './components/ProductStatusChart';
import { QuickActions } from './components/QuickActions';
import { RecentProducts } from './components/RecentProducts';
import { StatCards } from './components/StatCards';

export const HomeLayout = () => {
  const { data: stats } = useQuery({
    queryKey: ['home', 'stats'],
    queryFn: getHomeStats,
  });

  const { data: recentProducts = [] } = useQuery({
    queryKey: ['home', 'recent-products'],
    queryFn: getRecentProducts,
  });

  return (
    <div className="max-w-[80%] mx-auto space-y-6">
      {stats && <StatCards stats={stats} />}
      <div className="grid grid-cols-3 gap-4">
        {stats && <ProductStatusChart stats={stats} />}
        <QuickActions />
      </div>
      <RecentProducts products={recentProducts} />
    </div>
  );
};
