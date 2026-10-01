'use client';

import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { collectEndDateAtom, collectStartDateAtom, selectedAccountIdsAtom } from '@/features/order/store/collect.store';
import { useCollectingAccountIds, useRunOrderCollection } from '@/features/order/api/useRunOrderCollection';
import { findCollectionPeriodProblem } from '@/features/order/util/collectionRequest';
import { useAlert } from '@/hooks/useAlert';

export const CollectionActionSection = () => {
  const selectedAccountIds = useAtomValue(selectedAccountIdsAtom);
  const startDate = useAtomValue(collectStartDateAtom);
  const endDate = useAtomValue(collectEndDateAtom);
  const { mutate: run } = useRunOrderCollection();
  // 이 화면 인스턴스의 isPending이 아니라 진행 중인 수집 전체를 본다 — 화면을 다시 열어도 중복 실행을 막는다.
  const isCollecting = useCollectingAccountIds().length > 0;
  const { showAlert } = useAlert();

  const handleCollect = () => {
    if (selectedAccountIds.length === 0) return;

    // 화면에 보이는 기간으로 수집한다. 31일 한도는 요청 전에 막는다(route도 한 번 더 막는다).
    const periodProblem = findCollectionPeriodProblem(startDate, endDate);
    if (periodProblem) {
      showAlert({ message: periodProblem, type: 'warning' });
      return;
    }

    // 결과 알림·선택 해제는 훅 단위 콜백이 한다(화면을 떠나도 실행).
    run({ accountIds: [...selectedAccountIds], startDate, endDate });
  };

  return (
    <div className="flex justify-center py-2">
      <Button onClick={handleCollect} disabled={selectedAccountIds.length === 0 || isCollecting} size="lg">
        주문수집
        {selectedAccountIds.length > 0 && ` (${selectedAccountIds.length}건)`}
      </Button>
    </div>
  );
};
