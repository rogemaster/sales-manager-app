export const LoginSideBanner = () => {
  return (
    <div className="relative hidden bg-zinc-900 md:block">
      {/* 배경 장식 원 */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
      <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-white/[0.02]" />

      {/* 브랜드 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <span className="text-2xl font-black text-white">S</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-white">SMP</h2>
          <p className="text-sm font-medium tracking-widest text-white/40 uppercase">Sales Management Platform</p>
        </div>
        <div className="h-px w-16 bg-white/20" />
        <p className="max-w-[220px] text-sm leading-relaxed text-white/50">
          쇼핑몰 판매 데이터를 한 곳에서 효율적으로 관리하세요.
        </p>
      </div>
    </div>
  );
};
