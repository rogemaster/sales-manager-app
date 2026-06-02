import { HomeOrderStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeOrderStats;
};

const items = (stats: HomeOrderStats) => [
  { label: '신규주문', value: stats.newOrder.toLocaleString() },
  { label: '발주확인', value: stats.confirmedOrder.toLocaleString() },
  { label: '송장등록/전송', value: stats.invoice.toLocaleString() },
];

export const OrderStatCards = ({ stats }: Props) => {
  return (
    <div className="flex items-center rounded-xl border border-indigo-100 bg-indigo-50/60 px-[18px] py-[14px] transition-colors hover:bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50">
      <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-indigo-600 dark:text-indigo-400">주문</span>
      <div className="mx-[18px] h-8 w-px shrink-0 bg-indigo-200 dark:bg-indigo-800" />
      <div className="flex flex-1">
        {items(stats).map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1 border-r border-indigo-100 px-3 last:border-r-0 dark:border-indigo-900">
            <span className="text-[26px] font-extrabold leading-none tracking-tight text-indigo-700 dark:text-indigo-300">{item.value}</span>
            <span className="whitespace-nowrap text-[10px] text-indigo-400 dark:text-indigo-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
