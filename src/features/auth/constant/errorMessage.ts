import { PASSWORD_RULE_MESSAGE } from '@/shared/utils/password';
import { EMAIL_FORMAT_MESSAGE } from '@/shared/utils/email';

export const ERROR_MESSAGE = {
  LOGIN_FIELD: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.',
  INVALID_EMAIL_FORMAT: EMAIL_FORMAT_MESSAGE,
  NOT_FOUND_USER: '이메일 또는 패스워드가 올바르지 않습니다.',
  NOT_FOUND_EMAIL: '이메일을 입력해주세요.',
  NOT_FOUND_PASSWORD: '패스워드를 입력해주세요.',
  INVALID_PASSWORD_FORMAT: PASSWORD_RULE_MESSAGE,
  PENDING_APPROVAL: '슈퍼관리자 승인 후 로그인할 수 있습니다.',
};
