'use client';

import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { useAlert } from '@/hooks/useAlert';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useResendMallLinkedProducts } from '@/features/mallLinkedProduct/api/useResendMallLinkedProducts';
import { MallLinkedProductTable } from './components/MallLinkedProductTable';

type Props = {
  linkedProducts: MallLinkedProduct[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallLinkedProductTableSection = ({
  linkedProducts,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
}: Props) => {
  const [selectedLinkedIds, setSelectedLinkedIds] = useAtom(selectedLinkedIdsAtom);
  const { mutate: resend, isPending } = useResendMallLinkedProducts();
  const { showAlert } = useAlert();

  const handleResend = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '재전송할 연동 상품을 선택해주세요.', type: 'warning' });
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
      onError: () => {
        setSelectedLinkedIds([]);
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">전체 {isLoading ? '-' : total}건</CardTitle>
          <Button size="sm" onClick={handleResend} disabled={isPending || selectedLinkedIds.length === 0}>
            선택 재전송{selectedLinkedIds.length > 0 ? ` (${selectedLinkedIds.length})` : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <MallLinkedProductTable linkedProducts={linkedProducts} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
