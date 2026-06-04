'use client';

import { Control, Controller, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RegisterFormData, formatPhone } from '@/features/auth/util/registerValidation';

type Props = {
  register: UseFormRegister<RegisterFormData>;
  control: Control<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
};

export const ContactSection = ({ register, control, errors }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">담당자 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-3 gap-4">
          {/* 담당자명 */}
          <div className="grid gap-1.5">
            <Label htmlFor="contactName">
              담당자명 <span className="text-destructive">*</span>
            </Label>
            <Input id="contactName" {...register('contactName')} />
            {errors.contactName && <p className="text-xs text-destructive">{errors.contactName.message}</p>}
          </div>

          {/* 담당자 이메일 */}
          <div className="grid gap-1.5">
            <Label htmlFor="contactEmail">
              담당자 이메일 <span className="text-destructive">*</span>
            </Label>
            <Input id="contactEmail" type="email" {...register('contactEmail')} />
            {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
          </div>

          {/* 담당자 휴대폰 */}
          <div className="grid gap-1.5">
            <Label htmlFor="contactPhone">
              담당자 휴대폰 <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="contactPhone"
              control={control}
              render={({ field }) => (
                <Input
                  id="contactPhone"
                  placeholder="010-0000-0000"
                  value={field.value}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              )}
            />
            {errors.contactPhone && <p className="text-xs text-destructive">{errors.contactPhone.message}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
