'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ProductBulkEditGroupKey } from '@/features/mallLinkedProduct/constant/productBulkEdit.constants';
import { useBulkEditChecked } from './BulkEditFieldWrapper';

type Props = {
  group: ProductBulkEditGroupKey;
  title: string;
  description: string;
  children: ReactNode;
};

/**
 * 섹션 전체를 체크박스 하나로 켜고 끈다 (옵션·정보고시용).
 *
 * 이 두 섹션은 기존 상품 폼 컴포넌트를 그대로 재사용하므로 내부에 체크박스를 넣을 수 없다.
 * 대신 카드로 감싸 헤더에 체크박스를 두고, 미체크면 내부 조작을 막는다.
 */
export const BulkEditSectionWrapper = ({ group, title, description, children }: Props) => {
  const { checked, toggle } = useBulkEditChecked();
  const isChecked = checked[group] === true;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Checkbox id={`bulk-${group}`} checked={isChecked} onCheckedChange={(next: boolean) => toggle(group, next)} />
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">
              <Label htmlFor={`bulk-${group}`}>{title}</Label>
            </CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* pointer-events-none은 마우스만 막고 Tab 이동은 그대로 통과한다. inert가 포커스와 보조기기 노출까지 막는다. */}
        <div inert={!isChecked} className={isChecked ? undefined : 'pointer-events-none opacity-50'}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
};
