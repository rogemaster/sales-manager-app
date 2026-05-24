'use client';

import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { selectedJobIdsAtom } from '@/features/order/store/collect.store';
import { useTriggerOrderCollection } from '@/features/order/api/useTriggerOrderCollection';
import { useAlert } from '@/hooks/useAlert';

export const CollectionActionSection = () => {
  const [selectedJobIds, setSelectedJobIds] = useAtom(selectedJobIdsAtom);
  const { mutate: trigger, isPending } = useTriggerOrderCollection();
  const { showAlert } = useAlert();

  const handleCollect = () => {
    if (selectedJobIds.length === 0) return;

    const snapshotIds = [...selectedJobIds];

    trigger(snapshotIds, {
      onSuccess: ({ triggeredCount }) => {
        setSelectedJobIds([]);
        showAlert({ message: `${triggeredCount}개 수집을 시작했습니다.`, type: 'success' });
      },
      onError: () => {
        showAlert({ message: '주문수집 실행 중 오류가 발생했습니다.', type: 'warning' });
      },
    });
  };

  return (
    <div className="flex justify-center py-2">
      <Button onClick={handleCollect} disabled={selectedJobIds.length === 0 || isPending} size="lg">
        주문수집
        {selectedJobIds.length > 0 && ` (${selectedJobIds.length}건)`}
      </Button>
    </div>
  );
};
