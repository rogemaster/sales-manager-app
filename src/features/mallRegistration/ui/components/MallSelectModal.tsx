'use client';

import { useMemo, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';
import { ShoppingMalls } from '@/types/common.type';
import { useGetActiveShoppingSettings } from '@/features/shoppingSetting/api/useGetActiveShoppingSettings';
import {
  isRegisterModalOpenAtom,
  selectedProductIdsAtom,
  addStagedRegistrationsAtom,
} from '@/features/mallRegistration/store/mallRegistration.store';

export const MallSelectModal = () => {
  const [open, setOpen] = useAtom(isRegisterModalOpenAtom);
  const [selectedProductIds, setSelectedProductIds] = useAtom(selectedProductIdsAtom);
  const addStagedRegistrations = useSetAtom(addStagedRegistrationsAtom);
  const { data: options = [] } = useGetActiveShoppingSettings();

  const [selectedMalls, setSelectedMalls] = useState<ShoppingMalls[]>([]);
  const [settingByMall, setSettingByMall] = useState<Record<string, string>>({});

  const mallGroups = useMemo(() => {
    const groups: Record<string, typeof options> = {};
    options.forEach((option) => {
      if (!groups[option.mallCode]) groups[option.mallCode] = [];
      groups[option.mallCode].push(option);
    });
    return groups;
  }, [options]);

  const availableMallCodes = Object.keys(mallGroups) as ShoppingMalls[];

  const handleToggleMall = (mallCode: ShoppingMalls, checked: boolean) => {
    setSelectedMalls((prev) => (checked ? [...prev, mallCode] : prev.filter((code) => code !== mallCode)));
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedMalls([]);
    setSettingByMall({});
  };

  const handleComplete = () => {
    const registrations = selectedMalls
      .filter((mallCode) => !!settingByMall[mallCode])
      .map((mallCode) => {
        const settingId = settingByMall[mallCode];
        const setting = mallGroups[mallCode]?.find((option) => option.id === settingId);
        return { mallCode, shoppingSettingId: settingId, nickname: setting?.nickname || setting?.mallId || '' };
      });

    if (registrations.length > 0) {
      addStagedRegistrations({ productIds: selectedProductIds, registrations });
    }
    setSelectedProductIds([]);
    setOpen(false);
    setSelectedMalls([]);
    setSettingByMall({});
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>쇼핑몰 등록</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {availableMallCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록 가능한 쇼핑몰 설정이 없습니다.</p>
          ) : (
            availableMallCodes.map((mallCode) => (
              <div key={mallCode} className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedMalls.includes(mallCode)}
                    onCheckedChange={(checked: boolean) => handleToggleMall(mallCode, checked)}
                  />
                  <span className="text-sm font-medium">{getShoppingMallName(mallCode)}</span>
                </div>
                {selectedMalls.includes(mallCode) && (
                  <RadioGroup
                    value={settingByMall[mallCode] ?? ''}
                    onValueChange={(value) => setSettingByMall((prev) => ({ ...prev, [mallCode]: value }))}
                    className="pl-6"
                  >
                    {mallGroups[mallCode].map((setting) => (
                      <div key={setting.id} className="flex items-center gap-2">
                        <RadioGroupItem value={setting.id} id={setting.id} />
                        <Label htmlFor={setting.id} className="text-sm font-normal">
                          {setting.nickname || setting.mallId}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button onClick={handleComplete}>완료</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
