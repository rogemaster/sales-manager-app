'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingSettingBasicInfoSection } from './form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from './form/ShoppingSettingAddressSection';
import { ShoppingSettingMallInfoSection } from './form/ShoppingSettingMallInfoSection';

interface ShoppingSettingFormProps {
  submitLabel: string;
  isSubmitting?: boolean;
  /** 권한이 없는 등급(operator)이 상세를 볼 때. 입력을 막고 저장 버튼을 숨긴다. */
  readOnly?: boolean;
}

export const ShoppingSettingForm = ({ submitLabel, isSubmitting, readOnly = false }: ShoppingSettingFormProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* 섹션 3개는 연동상품 수정 화면과 공유한다 — 읽기 전용은 섹션이 아니라 여기서 fieldset으로 건다 */}
      {/* Radix Select는 fieldset disabled를 보지 않고 pointerdown으로 열리므로 inert로 상호작용 자체를 막는다. */}
      <fieldset disabled={readOnly} inert={readOnly} className="space-y-6">
        <ShoppingSettingBasicInfoSection />
        <ShoppingSettingAddressSection />
        <ShoppingSettingMallInfoSection />
      </fieldset>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/shopping/settings')}>
          {readOnly ? '목록으로' : '취소'}
        </Button>
        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
