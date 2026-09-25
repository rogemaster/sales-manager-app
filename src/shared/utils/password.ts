import { z } from 'zod';
import { maxLengthMessage, TEXT_LIMITS } from './textLimit';

/**
 * 비밀번호 규칙 — 가입·사용자 등록·로그인 검증이 이 하나를 쓴다.
 * 예전에는 가입만 9자+조합이고 사용자 등록·로그인은 6자였다(2026-09-25 통일).
 */
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{9,}$/;

export const PASSWORD_RULE_MESSAGE = '영어, 숫자, 특수문자 조합 9자 이상 입력해주세요';

export const isValidPassword = (value: string): boolean => PASSWORD_REGEX.test(value);

export const passwordSchema = z
  .string()
  .regex(PASSWORD_REGEX, PASSWORD_RULE_MESSAGE)
  .max(TEXT_LIMITS.password, maxLengthMessage(TEXT_LIMITS.password));
