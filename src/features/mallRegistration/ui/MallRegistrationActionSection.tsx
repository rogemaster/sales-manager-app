'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { useRegisterProductsToMalls } from '@/features/mallRegistration/api/useRegisterProductsToMalls';
import {
  selectedProductIdsAtom,
  isRegisterModalOpenAtom,
  stagedRegistrationsAtom,
  stagedCountAtom,
  resetMallRegistrationStateAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';

export const MallRegistrationActionSection = () => {
  const selectedProductIds = useAtomValue(selectedProductIdsAtom);
  const setModalOpen = useSetAtom(isRegisterModalOpenAtom);
  const stagedRegistrations = useAtomValue(stagedRegistrationsAtom);
  const stagedCount = useAtomValue(stagedCountAtom);
  const resetState = useSetAtom(resetMallRegistrationStateAtom);
  const { mutate: registerToMalls, isPending } = useRegisterProductsToMalls();
  const { showAlert } = useAlert();

  const handleOpenModal = () => {
    if (selectedProductIds.length === 0) {
      showAlert({ message: '등록할 상품을 선택해주세요.', type: 'warning' });
      return;
    }
    setModalOpen(true);
  };

  const handleSend = () => {
    const items: MallRegistrationRequestItem[] = Object.entries(stagedRegistrations).flatMap(
      ([productId, registrations]) =>
        registrations.map((reg) => ({
          productId,
          mallCode: reg.mallCode,
          shoppingSettingId: reg.shoppingSettingId,
        })),
    );

    if (items.length === 0) {
      showAlert({ message: '전송할 쇼핑몰 등록 내역이 없습니다.', type: 'warning' });
      return;
    }

    registerToMalls(items, {
      onSuccess: ({ totalCount, successCount, failCount }) => {
        // 결과와 무관하게 staging은 항상 비운다.
        // 실패 건은 연동 데이터로 남아 '쇼핑몰 연동 상품 목록' 화면에서 확인·수정한다.
        resetState();

        if (failCount === 0) {
          showAlert({ message: `${successCount}건이 쇼핑몰로 전송되었습니다.`, type: 'success' });
          return;
        }

        showAlert({
          message: `총 ${totalCount}건 중 ${successCount}건 전송 성공, ${failCount}건 실패했습니다.`,
          type: 'warning',
        });
      },
      onError: () => {
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="min-w-16 text-sm text-muted-foreground">
        선택 <span className="font-medium text-foreground">{selectedProductIds.length}</span>개
      </span>
      <Button variant="outline" size="sm" onClick={handleOpenModal}>
        쇼핑몰등록
      </Button>
      <Button size="sm" onClick={handleSend} disabled={isPending || stagedCount === 0}>
        쇼핑몰 전송{stagedCount > 0 ? ` (${stagedCount})` : ''}
      </Button>
    </div>
  );
};
