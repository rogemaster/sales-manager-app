'use client';

import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RegisterFormData } from '@/features/auth/util/registerValidation';

type Props = {
  register: UseFormRegister<RegisterFormData>;
  errors: FieldErrors<RegisterFormData>;
  isEmailChecked: boolean;
  emailAvailable: boolean | null;
  isEmailChecking: boolean;
  onEmailReset: () => void;
  onEmailCheck: () => Promise<void>;
};

export const LoginInfoSection = ({
  register,
  errors,
  isEmailChecked,
  emailAvailable,
  isEmailChecking,
  onEmailReset,
  onEmailCheck,
}: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">로그인 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* 이메일 */}
          <div className="grid gap-1.5">
            <Label htmlFor="email">
              이메일 <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                className="flex-1"
                {...register('email')}
                onChange={(e) => {
                  register('email').onChange(e);
                  onEmailReset();
                }}
              />
              <Button type="button" variant="secondary" onClick={onEmailCheck} disabled={isEmailChecking}>
                중복확인
              </Button>
            </div>
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            {!errors.email && isEmailChecked && emailAvailable === true && (
              <p className="text-xs text-green-600">사용 가능한 이메일입니다</p>
            )}
            {!errors.email && isEmailChecked && emailAvailable === false && (
              <p className="text-xs text-destructive">이미 사용 중인 이메일입니다</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="grid gap-1.5">
            <Label htmlFor="password">
              비밀번호 <span className="text-destructive">*</span>
            </Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">영어, 숫자, 특수문자 조합 9자 이상</p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="grid gap-1.5">
            <Label htmlFor="passwordConfirm">
              비밀번호 확인 <span className="text-destructive">*</span>
            </Label>
            <Input id="passwordConfirm" type="password" {...register('passwordConfirm')} />
            {errors.passwordConfirm && (
              <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
