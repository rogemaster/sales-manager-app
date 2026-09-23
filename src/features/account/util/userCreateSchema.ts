import { z } from 'zod';
import { SubUserGrade } from '@/features/auth/types/Auth';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';

/** 프로필 사진은 base64 data URL로 text 컬럼에 저장된다. 원본 약 700KB까지. */
export const AVATAR_MAX_LENGTH = 1_000_000;

const SUB_USER_GRADES = ['admin', 'operator'] as const satisfies readonly SubUserGrade[];

/** 사용자 등록 폼과 /api/account/users/create가 함께 쓴다. super_admin은 가입으로만 생기므로 등급에 없다. */
export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.').max(TEXT_LIMITS.email, maxLengthMessage(TEXT_LIMITS.email)),
  password: z
    .string()
    .min(6, '비밀번호는 6자 이상이어야 합니다.')
    .max(TEXT_LIMITS.password, maxLengthMessage(TEXT_LIMITS.password)),
  grade: z.enum(SUB_USER_GRADES, { message: '등급을 선택해주세요.' }),
  name: z.string().min(1, '이름을 입력해주세요.').max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText)),
  phone: phoneSchemaRequired(),
  avatar: z
    .string()
    .max(AVATAR_MAX_LENGTH, '프로필 사진은 약 700KB 이하만 등록할 수 있습니다.')
    .refine((value) => value === '' || value.startsWith('data:image/'), '프로필 사진 형식이 올바르지 않습니다.')
    .optional(),
  bio: z.string().max(TEXT_LIMITS.longText, maxLengthMessage(TEXT_LIMITS.longText)).optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
