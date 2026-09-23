import { z } from 'zod';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';

/** 프로필 수정 폼과 PATCH /api/profile이 함께 쓴다. */
export const profileEditSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText)),
  phone: phoneSchemaRequired(),
  company: z.string().max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText)).optional(),
  bio: z.string().max(TEXT_LIMITS.longText, maxLengthMessage(TEXT_LIMITS.longText)).optional(),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;
