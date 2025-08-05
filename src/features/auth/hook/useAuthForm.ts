"use client";

import { useState } from 'react';
import { Errors, LoginInfo } from '@/features/auth/types/Auth';
import { ERROR_MESSAGE } from '@/features/auth/constant/errorMessage';
import { testUsers } from '@/mock/testUser';
import { validateAuthForm } from '../util/Validators';
import { useSetAtom } from 'jotai';
import { setUserInfoAtom } from '../store/auth.store';
import { useRouter } from 'next/navigation';

export const useAuthForm = () => {
  const [formData, setFormData] = useState<LoginInfo>({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors>();
  const [isLoading, setIsLoading] = useState(false);
  // const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const setUserDataAtom = useSetAtom(setUserInfoAtom);

  // react-query 로 로그인 처리
  // const { mutate, isLoading, error } = useMutation({
  //   mutationFn: () => loginApi({ email, password }),
  //   onSuccess: (data) => setAuth(data),
  // });

  // 입력값 state 관리
  const handleInputChange = (field: keyof LoginInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // if (errors[field]) {
    //   setErrors((prev) => ({ ...prev, [field]: undefined }));
    // }
  }

  // const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  // 로그인 처리
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAuthForm(formData);
    if (!validation.isValid) {
      setErrors(validation.error);
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
      const user = testUsers.find((u) => u.email === formData.email && u.password === formData.password);

      if (user) {
        // 로그인 성공
        console.log('user', user);
        setFormData({ email: "", password: "" });
        setUserDataAtom(user);
        router.push('/home');
      } else {
        setErrors({general: ERROR_MESSAGE.NOT_FOUND_USER});
      }

    } catch (error) {
      console.error('로그인 에러: ', error);
      setErrors({general: ERROR_MESSAGE.LOGIN_FIELD});
    } finally {
      setIsLoading(false);
    }
  }

  return {
    formData,
    errors,
    isLoading,
    handleInputChange,
    handleLogin
  }
}