import { cn } from '@/lib/utils';
import { CollectionStatus } from '@/features/order/types/collection.types';

const STATUS_CONFIG: Record<Exclude<CollectionStatus, 'COLLECTING'>, { label: string; className: string }> = {
  WAITING: { label: '대기중', className: 'bg-gray-100 text-gray-600' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  FAILED: { label: '실패', className: 'bg-red-100 text-red-700' },
};

interface Props {
  status: CollectionStatus;
  collectedCount?: number;
  totalCount?: number;
}

export const CollectionStatusCell = ({ status, collectedCount = 0, totalCount = 0 }: Props) => {
  if (status === 'COLLECTING') {
    const percentage = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;
    return (
      <div className="flex flex-col gap-1 min-w-36">
        <span className="text-xs font-medium text-blue-600">
          {collectedCount.toLocaleString()} / {totalCount.toLocaleString()}
        </span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
};
