'use client';

import { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAlert } from '@/hooks/useAlert';
import { useGetActiveShoppingSettings } from '@/features/shoppingSetting/api/useGetActiveShoppingSettings';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { isSettingApplyModalOpenAtom, selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useBulkUpdateMallLinkedProducts } from '@/features/mallLinkedProduct/api/useBulkUpdateMallLinkedProducts';
import { buildSendResultAlert } from '@/features/mallLinkedProduct/util/sendResultAlert';

type Props = {
  linkedProducts: MallLinkedProduct[];
};

export const ShoppingSettingApplyModal = ({ linkedProducts }: Props) => {
  const [isOpen, setIsOpen] = useAtom(isSettingApplyModalOpenAtom);
  const selectedLinkedIds = useAtomValue(selectedLinkedIdsAtom);
  const { mutate: bulkUpdate, isPending } = useBulkUpdateMallLinkedProducts();
  const { showAlert } = useAlert();
  const [selectedSettingId, setSelectedSettingId] = useState<string>('');

  // 목록 페이지 마운트 시점에 이미 조회돼 캐시돼 있으므로 모달 오픈 게이팅을 별도로 걸지 않는다.
  const { data: activeSettings } = useGetActiveShoppingSettings();

  const selectedRecords = linkedProducts.filter((linked) => selectedLinkedIds.includes(linked.id));
  const targetMallCode = selectedRecords[0]?.mallCode;
  const targetAccountId = selectedRecords[0]?.settingSnapshot.mallAccountId;

  // 다른 계정의 설정을 적용하면 mallAccountId·mallId가 바뀌어 불변 규칙을 깨고, 재전송이 다른 계정을 향한다.
  const applicableSettings = (activeSettings ?? []).filter(
    (setting) => setting.mallCode === targetMallCode && setting.mallAccountId === targetAccountId,
  );

  // 모달을 닫았다 다시 열면 이전 선택이 남아 있지 않게 한다.
  useEffect(() => {
    if (!isOpen) setSelectedSettingId('');
  }, [isOpen]);

  const handleApply = () => {
    bulkUpdate(
      { ids: selectedLinkedIds, shoppingSettingId: selectedSettingId },
      {
        onSuccess: (result) => {
          setIsOpen(false);

          // 선택은 유지한다 — 수정 직후 곧바로 '선택 재전송'을 누를 수 있어야 한다.
          showAlert(buildSendResultAlert(result, 'update'));
        },
        onError: () => {
          showAlert({ message: '수정 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>쇼핑몰정보수정</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          선택한 {selectedLinkedIds.length}건에 적용할 쇼핑몰 정보설정을 선택하세요. 선택한 설정의 값으로 통째로
          교체됩니다.
        </p>

        {applicableSettings.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            이 쇼핑몰계정에 사용 가능한 정보설정이 없습니다.
          </p>
        ) : (
          <RadioGroup value={selectedSettingId} onValueChange={setSelectedSettingId} className="space-y-2">
            {applicableSettings.map((setting) => (
              <div key={setting.id} className="flex items-center gap-2">
                <RadioGroupItem value={setting.id} id={`setting-${setting.id}`} />
                <Label htmlFor={`setting-${setting.id}`}>
                  {setting.nickname} · {setting.mallId}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isPending}>
            취소
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isPending || !selectedSettingId}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
