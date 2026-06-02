import { HomeStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeStats;
};

const items = (stats: HomeStats) => [
  { label: '판매중', value: stats.onSale.toLocaleString() },
  { label: '품절', value: stats.soldOut.toLocaleString() },
  { label: '판매중지', value: stats.saleDis.toLocaleString() },
];

export const StatCards = ({ stats }: Props) => {
  return (
    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-[18px] py-[14px] transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-900/60">
      <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-slate-600 dark:text-slate-400">상품</span>
      <div className="mx-[18px] h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
      <div className="flex flex-1">
        {items(stats).map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1 border-r border-slate-200 px-3 last:border-r-0 dark:border-slate-700">
            <span className="text-[26px] font-extrabold leading-none tracking-tight text-slate-700 dark:text-slate-200">{item.value}</span>
            <span className="whitespace-nowrap text-[10px] text-slate-500 dark:text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
