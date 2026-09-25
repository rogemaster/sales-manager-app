import { z } from 'zod';
import { SUB_USER_GRADES } from '@/features/auth/constant/grade.constant';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { passwordSchema } from '@/shared/utils/password';
import { emailSchema } from '@/shared/utils/email';
import { userBioSchema, userNameSchema } from './userFieldSchema';

/** 프로필 사진은 base64 data URL로 text 컬럼에 저장된다. 원본 약 700KB까지. */
export const AVATAR_MAX_LENGTH = 1_000_000;

/** 사용자 등록 폼과 /api/account/users/create가 함께 쓴다. super_admin은 가입으로만 생기므로 등급에 없다. */
export const createUserSchema = z.object({
  email: emailSchema, // 가입과 같은 규칙
  password: passwordSchema, // 가입과 같은 규칙
  grade: z.enum(SUB_USER_GRADES, { message: '등급을 선택해주세요.' }),
  name: userNameSchema,
  phone: phoneSchemaRequired(),
  avatar: z
    .string()
    .max(AVATAR_MAX_LENGTH, '프로필 사진은 약 700KB 이하만 등록할 수 있습니다.')
    .refine((value) => value === '' || value.startsWith('data:image/'), '프로필 사진 형식이 올바르지 않습니다.')
    .optional(),
  bio: userBioSchema,
});

/**
 * 사용자 등록 요청 본문 = 폼 값. 서버가 같은 스키마로 검증하므로 클라이언트 타입도 여기서 파생한다.
 * (예전에는 폼 타입과 User에서 Omit으로 만든 본문 타입이 따로 있었고, avatar·bio를 `?? ''`로 옮겨 담았다.)
 */
export type CreateUserBody = z.infer<typeof createUserSchema>;
