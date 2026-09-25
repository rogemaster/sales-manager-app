import { z } from 'zod';
import { maxLengthMessage, TEXT_LIMITS } from './textLimit';

/** 이메일 형식 — 로그인 검증·빈 값을 허용하는 선택 이메일처럼 Zod 밖에서 직접 검사할 때 쓴다. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMAIL_FORMAT_MESSAGE = '올바른 이메일 형식을 입력해주세요';

/** 필수 이메일 필드. 가입·사용자 등록이 같은 규칙과 문구를 쓴다. */
export const emailSchema = z
  .string()
  .email(EMAIL_FORMAT_MESSAGE)
  .max(TEXT_LIMITS.email, maxLengthMessage(TEXT_LIMITS.email));
