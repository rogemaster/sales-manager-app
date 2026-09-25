import { z } from 'zod';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';

/** 사용자 이름·소개 — 사용자 등록과 프로필 수정이 같은 규칙을 쓴다. */
export const userNameSchema = z
  .string()
  .min(1, '이름을 입력해주세요.')
  .max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText));

export const userBioSchema = z.string().max(TEXT_LIMITS.longText, maxLengthMessage(TEXT_LIMITS.longText)).optional();
