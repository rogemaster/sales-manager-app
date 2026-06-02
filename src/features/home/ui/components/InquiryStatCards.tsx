const items = [
  { label: '신규문의', value: '0' },
  { label: '긴급메세지', value: '0' },
  { label: '처리완료', value: '0' },
];

export const InquiryStatCards = () => {
  return (
    <div className="flex items-center rounded-xl border border-emerald-100 bg-emerald-50/60 px-[18px] py-[14px] transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50">
      <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px] text-emerald-600 dark:text-emerald-400">문의</span>
      <div className="mx-[18px] h-8 w-px shrink-0 bg-emerald-200 dark:bg-emerald-800" />
      <div className="flex flex-1">
        {items.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1 border-r border-emerald-100 px-3 last:border-r-0 dark:border-emerald-900">
            <span className="text-[26px] font-extrabold leading-none tracking-tight text-emerald-700 dark:text-emerald-300">{item.value}</span>
            <span className="whitespace-nowrap text-[10px] text-emerald-500 dark:text-emerald-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
