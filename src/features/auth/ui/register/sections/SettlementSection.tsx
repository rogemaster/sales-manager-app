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

export const SettlementSection = ({ register, control, errors }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-muted-foreground" />
            <CardTitle className="text-sm">정산담당자 정보</CardTitle>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">선택</span>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {/* 담당자명 */}
            <div className="grid gap-1.5">
              <Label htmlFor="settlementName">담당자명</Label>
              <Input id="settlementName" {...register('settlementName')} />
            </div>

            {/* 담당자 이메일 */}
            <div className="grid gap-1.5">
              <Label htmlFor="settlementEmail">담당자 이메일</Label>
              <Input id="settlementEmail" type="email" {...register('settlementEmail')} />
              {errors.settlementEmail && (
                <p className="text-xs text-destructive">{errors.settlementEmail.message}</p>
              )}
            </div>

            {/* 담당자 휴대폰 */}
            <div className="grid gap-1.5">
              <Label htmlFor="settlementPhone">담당자 휴대폰</Label>
              <Controller
                name="settlementPhone"
                control={control}
                render={({ field }) => (
                  <Input
                    id="settlementPhone"
                    placeholder="010-0000-0000"
                    value={field.value}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                )}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">미입력시 담당자 이메일로 세금계산서가 발행됩니다.</p>
        </div>
      </CardContent>
    </Card>
  );
};
