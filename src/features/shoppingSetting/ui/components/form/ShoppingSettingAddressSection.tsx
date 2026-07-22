'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AddressSelectModal } from '../address/AddressSelectModal';
import { ShoppingSettingFormValues, MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

interface AddressPickerFieldProps {
  name: 'shippingAddress' | 'returnAddress';
  label: string;
  mallCode: ShoppingSettingFormValues['mallCode'];
  mallId: string;
}

const formatAddress = (address: MallAddress) =>
  `${address.name} (${address.zipCode}) ${address.address} ${address.addressDetail}`;

const AddressPickerField = ({ name, label, mallCode, mallId }: AddressPickerFieldProps) => {
  const { control } = useFormContext<ShoppingSettingFormValues>();
  const [open, setOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: `${label}를 선택해 주세요.` }}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label>{label} *</Label>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(true)}>
              {label} 선택
            </Button>
            <span className="text-sm text-muted-foreground">
              {field.value ? formatAddress(field.value) : `선택된 ${label}가 없습니다.`}
            </span>
          </div>
          {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
          <AddressSelectModal
            open={open}
            onOpenChange={setOpen}
            title={`${label} 선택`}
            nameColumnLabel={`${label}명`}
            mallCode={mallCode}
            mallId={mallId}
            value={field.value}
            onApply={field.onChange}
          />
        </div>
      )}
    />
  );
};

export const ShoppingSettingAddressSection = () => {
  const { watch } = useFormContext<ShoppingSettingFormValues>();
  const mallCode = watch('mallCode');
  const mallId = watch('mallId');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">출고지 / 반품지</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <AddressPickerField name="shippingAddress" label="출고지" mallCode={mallCode} mallId={mallId} />
        <AddressPickerField name="returnAddress" label="반품지" mallCode={mallCode} mallId={mallId} />
      </CardContent>
    </Card>
  );
};
