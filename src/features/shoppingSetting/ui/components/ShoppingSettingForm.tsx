'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingSettingBasicInfoSection } from './form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from './form/ShoppingSettingAddressSection';
import { ShoppingSettingMallFieldSection } from './form/ShoppingSettingMallFieldSection';

interface ShoppingSettingFormProps {
  submitLabel: string;
  isSubmitting?: boolean;
}

export const ShoppingSettingForm = ({ submitLabel, isSubmitting }: ShoppingSettingFormProps) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ShoppingSettingBasicInfoSection />
      <ShoppingSettingAddressSection />
      <ShoppingSettingMallFieldSection />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/shopping/settings')}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};
