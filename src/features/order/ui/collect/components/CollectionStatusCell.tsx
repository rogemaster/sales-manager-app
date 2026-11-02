import { cn } from '@/lib/utils';
import { CollectionRowStatus } from '@/features/order/types/collection.types';

const STATUS_CONFIG: Record<CollectionRowStatus | 'COLLECTING', { label: string; className: string }> = {
  WAITING: { label: '대기중', className: 'bg-gray-100 text-gray-600' },
  COLLECTING: { label: '수집중', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
};

interface Props {
  /** COLLECTING은 화면이 요청을 기다리는 동안만 쓴다(저장되지 않는 상태). */
  status: CollectionRowStatus | 'COLLECTING';
  newCount: number | null;
  duplicateCount: number | null;
  errorMessage: string | null;
}

export const CollectionStatusCell = ({ status, newCount, duplicateCount, errorMessage }: Props) => {
  const config = STATUS_CONFIG[status];
  const showCounts = status !== 'COLLECTING' && newCount !== null && duplicateCount !== null;
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        title={status === 'FAILED' && errorMessage ? errorMessage : undefined}
        className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', config.className)}
      >
        {config.label}
      </span>
      {/* 수집은 요청 1번에 끝나 서버가 중간 진행률을 주지 않는다 — 숫자 없이 진행 중임만 보인다 */}
      {status === 'COLLECTING' && (
        <div
          role="progressbar"
          aria-label="수집 진행 중"
          className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200"
        >
          <div className="h-full w-1/3 animate-indeterminate rounded-full bg-blue-500" />
        </div>
      )}
      {showCounts && (
        <span className="text-xs text-muted-foreground">
          신규 {newCount} · 중복 {duplicateCount}
        </span>
      )}
    </div>
  );
};
