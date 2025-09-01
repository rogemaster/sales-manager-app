'use client';

import { useState } from 'react';
import { Errors, LoginInfo } from '@/features/auth/types/Auth';
import { ERROR_MESSAGE } from '@/features/auth/constant/errorMessage';
import { validateAuthForm } from '../util/Validators';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useAuthForm = () => {
  const [formData, setFormData] = useState<LoginInfo>({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>();
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();

  // 입력값 state 관리
  const handleInputChange = (field: keyof LoginInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 에러 메시지 초기화
    if (errors?.[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // NextAuth를 사용한 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAuthForm(formData);
    if (!validation.isValid) {
      setErrors(validation.error);
      return;
    }

    setIsLoading(true);
    setErrors(undefined);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setErrors({ general: ERROR_MESSAGE.NOT_FOUND_USER });
      } else if (result?.ok) {
        // 로그인 성공
        setFormData({ email: '', password: '' });
        router.push('/home');
      }
    } catch (error) {
      console.error('로그인 에러: ', error);
      setErrors({ general: ERROR_MESSAGE.LOGIN_FIELD });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    errors,
    isLoading,
    handleInputChange,
    handleLogin,
  };
};
