'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { isSettingApplyModalOpenAtom, selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useResendMallLinkedProducts } from '@/features/mallLinkedProduct/api/useResendMallLinkedProducts';
import { MALL_LINK_SEND_MAX_ITEMS } from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import { getErrorMessage } from '@/shared/utils/errorMessage';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

const PRODUCT_BULK_EDIT_PATH = '/shopping/linked-products/bulk-edit/product';

export const MallLinkedProductActionSection = ({ linkedProducts }: Props) => {
  const router = useRouter();
  const [selectedLinkedIds, setSelectedLinkedIds] = useAtom(selectedLinkedIdsAtom);
  const setSettingModalOpen = useSetAtom(isSettingApplyModalOpenAtom);
  const { mutate: resend, isPending } = useResendMallLinkedProducts();
  const { showAlert } = useAlert();

  const selectedRecords = linkedProducts.filter((linked) => selectedLinkedIds.includes(linked.id));

  const handleResend = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '재전송할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }

    if (selectedLinkedIds.length > MALL_LINK_SEND_MAX_ITEMS) {
      showAlert({ message: `한 번에 최대 ${MALL_LINK_SEND_MAX_ITEMS}건까지 전송할 수 있습니다.`, type: 'warning' });
      return;
    }

    resend(selectedLinkedIds, {
      onSuccess: ({ totalCount, successCount, failCount }) => {
        // 결과와 무관하게 선택을 비운다. 목록을 다시 불러오므로 처리된 행이 계속 체크돼 있으면 혼란스럽다.
        // 실패 건은 목록에 사유와 함께 남아 거기서 다시 조치한다.
        setSelectedLinkedIds([]);

        if (failCount === 0) {
          showAlert({ message: `${successCount}건이 쇼핑몰로 전송되었습니다.`, type: 'success' });
          return;
        }

        showAlert({
          message: `총 ${totalCount}건 중 ${successCount}건 전송 성공, ${failCount}건 실패했습니다.`,
          type: 'warning',
        });
      },
      onError: (error) => {
        setSelectedLinkedIds([]);
        showAlert({
          message: getErrorMessage(error, '전송 중 오류가 발생했습니다. 다시 시도해주세요.'),
          type: 'error',
        });
      },
    });
  };

  const handleProductBulkEdit = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '수정할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }
    // 상품 값은 몰과 무관하므로 몰·계정이 섞여 있어도 그대로 진입한다.
    router.push(PRODUCT_BULK_EDIT_PATH);
  };

  const handleSettingBulkEdit = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '수정할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }

    // 설정 값은 몰·계정에 종속된다 — 출고지는 계정 주소록에서 고른 값이고 몰 고유정보는 몰마다 필드가 다르다.
    // 섞인 채로 적용하면 어느 쪽 기준으로 그려야 할지 정해지지 않는다 (domain-design.md).
    const mallCodes = new Set(selectedRecords.map((linked) => linked.mallCode));
    const accountIds = new Set(selectedRecords.map((linked) => linked.settingSnapshot.mallAccountId));

    if (mallCodes.size > 1 || accountIds.size > 1) {
      showAlert({ message: '동일한 쇼핑몰·쇼핑몰계정만 선택해 주세요.', type: 'warning' });
      return;
    }

    setSettingModalOpen(true);
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="min-w-16 text-sm text-muted-foreground">
        선택 <span className="font-medium text-foreground">{selectedLinkedIds.length}</span>개
      </span>
      <Button size="sm" onClick={handleResend} disabled={isPending || selectedLinkedIds.length === 0}>
        선택 재전송{selectedLinkedIds.length > 0 ? ` (${selectedLinkedIds.length})` : ''}
      </Button>
      <Button variant="outline" size="sm" onClick={handleProductBulkEdit}>
        상품정보수정
      </Button>
      <Button variant="outline" size="sm" onClick={handleSettingBulkEdit}>
        쇼핑몰정보수정
      </Button>
    </div>
  );
};
