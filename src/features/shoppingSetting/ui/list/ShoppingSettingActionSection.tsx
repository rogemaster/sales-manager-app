'use client';

import { useAtom, useSetAtom } from 'jotai';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { selectedSettingsAtom, isNewSettingModalOpenAtom } from '@/features/shoppingSetting/store/search.store';
import { useUpdateShoppingSettingsStatus } from '@/features/shoppingSetting/api/useUpdateShoppingSettingsStatus';
import { useDeleteShoppingSettings } from '@/features/shoppingSetting/api/useDeleteShoppingSettings';
import { useGetLinkedProductCount } from '@/features/shoppingSetting/api/useGetLinkedProductCount';
import { SETTING_STATUS_OPTIONS } from '@/features/shoppingSetting/constant/shoppingSetting.constants';
import { buildBulkResultAlert } from '@/shared/utils/bulkResultAlert';
import { useAlert } from '@/hooks/useAlert';
import { usePermission } from '@/features/auth/hook/usePermission';

export const ShoppingSettingActionSection = () => {
  const [selectedSettings, setSelectedSettings] = useAtom(selectedSettingsAtom);
  const setModalOpen = useSetAtom(isNewSettingModalOpenAtom);
  const { mutate: deleteSettings, isPending: isDeleting } = useDeleteShoppingSettings();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateShoppingSettingsStatus();
  const { mutateAsync: countLinkedProducts, isPending: isCounting } = useGetLinkedProductCount();
  const { showAlert } = useAlert();
  const [statusValue, setStatusValue] = useState<string>('true');

  const canCreate = usePermission('shoppingSetting.create');
  const canChangeStatus = usePermission('shoppingSetting.changeStatus');
  const canDelete = usePermission('shoppingSetting.delete');

  if (!canCreate && !canChangeStatus && !canDelete) return null;

  const handleDelete = async () => {
    if (selectedSettings.length === 0) {
      showAlert({ message: '삭제할 항목을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedSettings];
    const count = snapshotIds.length;

    // 연동 건수를 모르는 채로 삭제하면 경고 없이 지워지므로, 조회에 실패하면 삭제를 진행하지 않는다.
    let linkedCount: number;
    try {
      const { totalCount } = await countLinkedProducts(snapshotIds);
      linkedCount = totalCount;
    } catch {
      showAlert({ message: '연동 상품 건수를 확인하지 못했습니다. 다시 시도해주세요.', type: 'error' });
      return;
    }

    // 연동 데이터는 설정과 독립적인 데이터라 설정을 지워도 삭제되지 않는다 (domain-design.md).
    const linkedNotice =
      linkedCount > 0
        ? `\n\n이 설정으로 전송된 연동 상품 ${linkedCount}건이 있습니다. 연동 상품은 삭제되지 않고 그대로 유지됩니다.`
        : '';

    showAlert({
      title: '설정 삭제',
      message: `선택한 ${count}개의 설정을 삭제하시겠습니까?${linkedNotice}`,
      showCancel: true,
      onConfirm: () => {
        deleteSettings(snapshotIds, {
          onSuccess: ({ successCount, failures }) => {
            setSelectedSettings([]);
            showAlert(buildBulkResultAlert('삭제', successCount, failures));
          },
        });
      },
    });
  };

  const handleChangeStatus = () => {
    if (selectedSettings.length === 0) {
      showAlert({ message: '변경할 항목을 선택해주세요.', type: 'warning' });
      return;
    }
    const snapshotIds = [...selectedSettings];
    updateStatus(
      { ids: snapshotIds, isActive: statusValue === 'true' },
      {
        onSuccess: ({ successCount, failures }) => {
          setSelectedSettings([]);
          showAlert(buildBulkResultAlert('변경', successCount, failures));
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-muted-foreground min-w-16">
        선택 <span className="font-medium text-foreground">{selectedSettings.length}</span>개
      </span>
      {canCreate && (
        <Button size="sm" onClick={() => setModalOpen(true)}>
          신규추가
        </Button>
      )}
      {canChangeStatus && (
        <>
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETTING_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleChangeStatus} disabled={isUpdating}>
            사용여부변경
          </Button>
        </>
      )}
      {canDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting || isCounting}>
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      )}
    </div>
  );
};
