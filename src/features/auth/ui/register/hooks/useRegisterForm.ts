'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAlert } from '@/hooks/useAlert';
import { registerSchema, RegisterBody, RegisterFormData } from '@/features/auth/util/registerValidation';

const EMAIL_CHECK_FAILED_MESSAGE = '이메일 중복 확인에 실패했습니다. 다시 시도해주세요.';
const REGISTER_FAILED_MESSAGE = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';

/** 화면에 그대로 보여줄 문구를 담은 오류. 네트워크 오류 등 그 밖의 예외는 고정 문구로 바꿔 보여준다. */
class ShownError extends Error {}

/** 서버가 보낸 { error } 문구가 있으면 그것을, 없으면 fallback을 쓴다. */
const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
  const body: unknown = await res.json().catch(() => null);
  const message = (body as { error?: unknown } | null)?.error;
  return typeof message === 'string' && message ? message : fallback;
};

const toShownMessage = (error: unknown, fallback: string): string =>
  error instanceof ShownError ? error.message : fallback;

export const useRegisterForm = () => {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);
  const [businessLicenseError, setBusinessLicenseError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
      companyName: '',
      representativeName: '',
      businessNumber: '',
      businessCategory: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      settlementName: '',
      settlementEmail: '',
      settlementPhone: '',
    },
  });

  const handleEmailReset = () => {
    setIsEmailChecked(false);
    setEmailAvailable(null);
  };

  const handleEmailCheck = async () => {
    const isEmailValid = await form.trigger('email');
    if (!isEmailValid) return;

    const email = form.getValues('email');
    setIsEmailChecking(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // 실패 응답을 "확인 완료"로 두면 사용 가능 여부가 undefined인 채 확인된 것처럼 보인다.
      if (!res.ok) throw new ShownError(await readErrorMessage(res, EMAIL_CHECK_FAILED_MESSAGE));
      const data = (await res.json()) as { available?: unknown };
      if (typeof data.available !== 'boolean') throw new ShownError(EMAIL_CHECK_FAILED_MESSAGE);
      setEmailAvailable(data.available);
      setIsEmailChecked(true);
    } catch (error) {
      setEmailAvailable(null);
      setIsEmailChecked(false);
      form.setError('email', { message: toShownMessage(error, EMAIL_CHECK_FAILED_MESSAGE) });
    } finally {
      setIsEmailChecking(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    setBusinessLicense(file);
    if (file) setBusinessLicenseError('');
  };

  const handleFormSubmit = async (data: RegisterFormData) => {
    setSubmitError('');

    if (!isEmailChecked || !emailAvailable) {
      form.setError('email', { message: '이메일 중복 확인이 필요합니다' });
      return;
    }
    if (!businessLicense) {
      setBusinessLicenseError('사업자등록증을 첨부해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordConfirm: _, ...rest } = data;
      const body: RegisterBody = { ...rest, businessLicenseName: businessLicense.name };
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      // "이미 사용 중인 이메일입니다." 같은 서버 사유를 고정 문구로 덮지 않는다.
      if (!res.ok) throw new ShownError(await readErrorMessage(res, REGISTER_FAILED_MESSAGE));

      showAlert({
        type: 'success',
        title: '가입이 완료되었습니다',
        message: '가입하신 이메일과 비밀번호로 로그인해 주세요.',
        confirmText: '로그인 페이지로 이동',
        onConfirm: () => router.push('/login'),
      });
    } catch (error) {
      setSubmitError(toShownMessage(error, REGISTER_FAILED_MESSAGE));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
    onSubmit: form.handleSubmit(handleFormSubmit),
  };
};
