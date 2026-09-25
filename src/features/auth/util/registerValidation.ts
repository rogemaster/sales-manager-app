import { z } from 'zod';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { passwordSchema } from '@/shared/utils/password';
import { EMAIL_FORMAT_MESSAGE, EMAIL_REGEX, emailSchema } from '@/shared/utils/email';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';

export { formatPhone } from '@/shared/utils/phone';

const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/;

const shortText = (emptyMessage?: string) => {
  const base = z.string().max(TEXT_LIMITS.shortText, maxLengthMessage(TEXT_LIMITS.shortText));
  return emptyMessage ? base.min(1, emptyMessage) : base;
};

/**
 * 가입 요청 본문. /api/register가 이 스키마로 검증한다.
 * passwordConfirm은 화면에서만 쓰므로 여기 없다 — refine이 붙은 스키마는 omit할 수 없어 기본 객체를 따로 둔다.
 */
export const registerBaseSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  companyName: shortText('상호/법인명을 입력해주세요'),
  representativeName: shortText('대표자명을 입력해주세요'),
  businessNumber: z.string().regex(BUSINESS_NUMBER_REGEX, '올바른 사업자등록번호 형식을 입력해주세요'),
  businessCategory: shortText('업종을 선택해주세요'),
  contactName: shortText('담당자명을 입력해주세요'),
  contactEmail: emailSchema,
  contactPhone: phoneSchemaRequired('담당자 휴대폰을 입력해주세요', '올바른 휴대폰 형식이 아닙니다. (예: 010-1234-5678)'),
  settlementName: shortText(),
  settlementEmail: z
    .string()
    .max(TEXT_LIMITS.email, maxLengthMessage(TEXT_LIMITS.email))
    .refine((val) => val === '' || EMAIL_REGEX.test(val), EMAIL_FORMAT_MESSAGE),
  settlementPhone: shortText(),
  // 사업자등록증 파일명. 폼 필드가 아니라 제출 시 따로 붙여 보낸다.
  businessLicenseName: shortText().default(''),
});

export type RegisterBody = z.infer<typeof registerBaseSchema>;

/** 이메일 중복 확인 요청 본문. /api/check-email이 가입과 같은 이메일 규칙으로 검증한다. */
export const checkEmailSchema = registerBaseSchema.pick({ email: true });

/** 가입 폼. 서버 스키마에 비밀번호 확인을 더한다. */
export const registerSchema = registerBaseSchema
  .omit({ businessLicenseName: true })
  .extend({ passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요') })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['passwordConfirm'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const formatBusinessNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};
