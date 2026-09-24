import { HomeLinkedProductStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeLinkedProductStats;
};

const items = (stats: HomeLinkedProductStats) => [
  { label: '전체', value: stats.total.toLocaleString() },
  { label: '성공', value: stats.success.toLocaleString() },
  { label: '실패', value: stats.failed.toLocaleString() },
];

export const LinkedProductStatCards = ({ stats }: Props) => {
  return (
    <div className="flex items-center rounded-xl border border-sky-100 bg-sky-50/60 px-[18px] py-[14px] transition-colors hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 dark:hover:bg-sky-950/50">
      <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-sky-600 dark:text-sky-400">연동상품</span>
      <div className="mx-[18px] h-8 w-px shrink-0 bg-sky-200 dark:bg-sky-800" />
      <div className="flex flex-1">
        {items(stats).map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1 border-r border-sky-100 px-3 last:border-r-0 dark:border-sky-900">
            <span className="text-[26px] font-extrabold leading-none tracking-tight text-sky-700 dark:text-sky-300">{item.value}</span>
            <span className="whitespace-nowrap text-[10px] text-sky-400 dark:text-sky-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
