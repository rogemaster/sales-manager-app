import { HomeOrderStats } from '@/features/home/types/home.types';

type Props = {
  stats: HomeOrderStats;
};

const items = (stats: HomeOrderStats) => [
  { label: '취소요청/처리중', value: stats.cancelClaim.toLocaleString() },
  { label: '반품요청/처리중', value: stats.returnClaim.toLocaleString() },
  { label: '교환요청/처리중', value: stats.exchangeClaim.toLocaleString() },
];

export const ClaimStatCards = ({ stats }: Props) => {
  return (
    <div className="flex items-center rounded-xl border border-red-100 bg-red-50/60 px-[18px] py-[14px] transition-colors hover:bg-red-50 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/50">
      <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-red-600 dark:text-red-400">클레임</span>
      <div className="mx-[18px] h-8 w-px shrink-0 bg-red-200 dark:bg-red-800" />
      <div className="flex flex-1">
        {items(stats).map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1 border-r border-red-100 px-3 last:border-r-0 dark:border-red-900">
            <span className="text-[26px] font-extrabold leading-none tracking-tight text-red-700 dark:text-red-300">{item.value}</span>
            <span className="whitespace-nowrap text-[10px] text-red-400 dark:text-red-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
