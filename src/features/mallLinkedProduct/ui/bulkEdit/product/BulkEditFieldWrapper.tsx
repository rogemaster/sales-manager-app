'use client';

import { createContext, ReactNode, useContext } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
} from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';

type BulkEditContextValue = {
  checked: ProductBulkEditChecked;
  toggle: (group: ProductBulkEditGroupKey, next: boolean) => void;
};

const BulkEditContext = createContext<BulkEditContextValue | null>(null);

export const BulkEditProvider = ({ value, children }: { value: BulkEditContextValue; children: ReactNode }) => (
  <BulkEditContext.Provider value={value}>{children}</BulkEditContext.Provider>
);

export const useBulkEditChecked = (): BulkEditContextValue => {
  const context = useContext(BulkEditContext);
  if (!context) throw new Error('useBulkEditChecked는 BulkEditProvider 안에서만 쓸 수 있습니다.');
  return context;
};

type Props = {
  group: ProductBulkEditGroupKey;
  label: string;
  children: ReactNode;
};

/**
 * 필드 하나를 체크박스 + 라벨과 함께 감싼다.
 *
 * 체크 해제 시 입력을 지우지 않고 비활성화만 한다 — 체크를 껐다 켜는 사이에 입력값이 사라지면
 * 사용자가 다시 입력해야 한다.
 */
export const BulkEditFieldWrapper = ({ group, label, children }: Props) => {
  const { checked, toggle } = useBulkEditChecked();
  const isChecked = checked[group] === true;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox id={`bulk-${group}`} checked={isChecked} onCheckedChange={(next: boolean) => toggle(group, next)} />
        <Label htmlFor={`bulk-${group}`}>{label}</Label>
      </div>
      {/* pointer-events-none은 마우스만 막고 Tab 이동은 그대로 통과한다. inert가 포커스와 보조기기 노출까지 막는다. */}
      <div inert={!isChecked} className={isChecked ? undefined : 'pointer-events-none opacity-50'}>
        {children}
      </div>
    </div>
  );
};
