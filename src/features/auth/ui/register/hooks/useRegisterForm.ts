'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAlert } from '@/hooks/useAlert';
import { registerSchema, RegisterFormData } from '@/features/auth/util/registerValidation';

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
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setEmailAvailable(data.available);
      setIsEmailChecked(true);
    } catch {
      setEmailAvailable(null);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
        method: 'POST',
        body: JSON.stringify({ ...data, businessLicenseName: businessLicense.name }),
      });
      if (!res.ok) throw new Error('가입 실패');

      showAlert({
        type: 'success',
        title: '가입이 완료되었습니다',
        message:
          '※ MSW 개발 환경으로 인해 실제 신규 가입은 지원되지 않습니다.\n' +
          '아래 테스트 계정으로 로그인해 주세요.\n\n' +
          '이메일: admin@example.com\n' +
          '비밀번호: admin123',
        confirmText: '로그인 페이지로 이동',
        onConfirm: () => router.push('/login'),
      });
    } catch {
      setSubmitError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
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
