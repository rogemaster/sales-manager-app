import { z } from 'zod';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';
import { userBioSchema, userNameSchema } from '@/features/account/util/userFieldSchema';

/** 프로필 수정 폼과 PATCH /api/profile이 함께 쓴다. */
export const profileEditSchema = z.object({
  name: userNameSchema,
  phone: phoneSchemaRequired(),
  company: z.string().max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText)).optional(),
  bio: userBioSchema,
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;
