'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoginInfoSection } from './sections/LoginInfoSection';
import { CompanyInfoSection } from './sections/CompanyInfoSection';
import { ContactSection } from './sections/ContactSection';
import { SettlementSection } from './sections/SettlementSection';
import { useRegisterForm } from './hooks/useRegisterForm';

export const RegisterForm = () => {
  const {
    form,
    isEmailChecked,
    emailAvailable,
    isEmailChecking,
    businessLicense,
    businessLicenseError,
    isSubmitting,
    submitError,
    handleEmailReset,
    handleEmailCheck,
    handleFileChange,
    onSubmit,
  } = useRegisterForm();

  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
        <p className="text-sm text-muted-foreground">아래 정보를 모두 입력하여 가입을 완료하세요</p>
      </div>

      <LoginInfoSection
        register={register}
        errors={errors}
        isEmailChecked={isEmailChecked}
        emailAvailable={emailAvailable}
        isEmailChecking={isEmailChecking}
        onEmailReset={handleEmailReset}
        onEmailCheck={handleEmailCheck}
      />

      <CompanyInfoSection
        register={register}
        control={control}
        errors={errors}
        businessLicense={businessLicense}
        businessLicenseError={businessLicenseError}
        onFileChange={handleFileChange}
      />

      <ContactSection register={register} control={control} errors={errors} />

      <SettlementSection register={register} control={control} errors={errors} />

      {submitError && <p className="text-center text-sm text-destructive">{submitError}</p>}

      <div className="flex flex-col gap-3">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '가입 중...' : '회원가입'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            로그인
          </Link>
        </p>
      </div>
    </form>
  );
};
