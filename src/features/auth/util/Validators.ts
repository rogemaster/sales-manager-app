import { LoginInfo, ValidationResult } from '@/features/auth/types/Auth';
import { ERROR_MESSAGE } from '../constant/errorMessage';

export const validateAuthForm = (formData: LoginInfo): ValidationResult => {
  const error: ValidationResult['error'] = {};

  // 이메일 인증
  if (formData.email.trim() === '') {
    error.email = ERROR_MESSAGE.NOT_FOUND_EMAIL;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      error.email = ERROR_MESSAGE.SIGNUP_FIELD;
    }
  }

  // 패스워드 인증
  if (!formData.password.trim()) {
    error.password = ERROR_MESSAGE.NOT_FOUND_PASSWORD;
  } else if (formData.password.length < 6) {
    error.password = ERROR_MESSAGE.NOT_FOUND_PASSWORD_LENGTH;
  }

  return {
    isValid: Object.keys(error).length === 0,
    error
  }
}