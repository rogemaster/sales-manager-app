import { LoginInfo, ValidationResult } from '@/features/auth/types/Auth';
import { ERROR_MESSAGE } from '../constant/errorMessage';
import { isValidPassword } from '@/shared/utils/password';
import { EMAIL_REGEX } from '@/shared/utils/email';

export const validateAuthForm = (formData: LoginInfo): ValidationResult => {
  const error: ValidationResult['error'] = {};

  // 이메일 인증
  if (formData.email.trim() === '') {
    error.email = ERROR_MESSAGE.NOT_FOUND_EMAIL;
  } else {
    if (!EMAIL_REGEX.test(formData.email)) {
      error.email = ERROR_MESSAGE.INVALID_EMAIL_FORMAT;
    }
  }

  // 패스워드 인증
  if (!formData.password.trim()) {
    error.password = ERROR_MESSAGE.NOT_FOUND_PASSWORD;
  } else if (!isValidPassword(formData.password)) {
    error.password = ERROR_MESSAGE.INVALID_PASSWORD_FORMAT;
  }

  return {
    isValid: Object.keys(error).length === 0,
    error
  }
}