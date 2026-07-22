'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ShoppingSettingFormValues } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { YES_NO_OPTIONS } from '@/features/shoppingSetting/constant/shoppingSetting.constants';

type MallSettingsFieldName = keyof NonNullable<ShoppingSettingFormValues['mallSettings']>;

const BooleanField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { control } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        name={`mallSettings.${name}` as 'mallSettings.purchaseReviewExposure'}
        control={control}
        render={({ field }) => (
          <RadioGroup
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            onValueChange={(val) => field.onChange(val === 'true')}
            className="flex gap-6"
          >
            {YES_NO_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <RadioGroupItem value={option.id} id={`${name}-${option.id}`} />
                <Label htmlFor={`${name}-${option.id}`}>{option.name}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
    </div>
  );
};

const TextField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { register } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        placeholder={`${label}을(를) 입력하세요.`}
        {...register(`mallSettings.${name}` as 'mallSettings.certs')}
      />
    </div>
  );
};

const TextareaField = ({ name, label }: { name: MallSettingsFieldName; label: string }) => {
  const { register } = useFormContext<ShoppingSettingFormValues>();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        placeholder={`${label}을(를) 입력하세요.`}
        {...register(`mallSettings.${name}` as 'mallSettings.afterServiceGuide')}
      />
    </div>
  );
};

const NaverMallSettingsFields = () => (
  <>
    <TextField name="afterServiceContact" label="A/S 전화번호" />
    <TextareaField name="afterServiceGuide" label="A/S 안내문구" />
    <BooleanField name="purchaseReviewExposure" label="구매평 노출" />
    <TextField name="logisticsCompanyId" label="풀필먼트 물류사 ID" />
    <TextField name="logisticsCenterId" label="풀필먼트 물류센터 ID" />
    <TextField name="certificationInfo" label="인증정보" />
    <TextField name="certificationExcludeReason" label="인증 예외처리 사유" />
  </>
);

const KakaoMallSettingsFields = () => (
  <>
    <TextField name="certs" label="인증정보" />
    <TextField name="additionalInfo" label="부가정보" />
    <BooleanField name="shoppingHowDisplayable" label="쇼핑하우 전시여부" />
    <TextField name="storeboardDisplayStatus" label="스토어보드 전시상태" />
  </>
);

export const ShoppingSettingMallInfoSection = () => {
  const { watch } = useFormContext<ShoppingSettingFormValues>();
  const mallCode = watch('mallCode');

  if (mallCode !== 'NSST' && mallCode !== 'KAKAOS') {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">몰 고유 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {mallCode === 'NSST' ? <NaverMallSettingsFields /> : <KakaoMallSettingsFields />}
      </CardContent>
    </Card>
  );
};
