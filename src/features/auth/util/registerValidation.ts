import { z } from 'zod';
import { phoneSchemaRequired } from '@/shared/utils/phone';

export { formatPhone } from '@/shared/utils/phone';

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{9,}$/;
const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/;

export const registerSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식을 입력해주세요'),
    password: z.string().regex(PASSWORD_REGEX, '영어, 숫자, 특수문자 조합 9자 이상 입력해주세요'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요'),
    companyName: z.string().min(1, '상호/법인명을 입력해주세요'),
    representativeName: z.string().min(1, '대표자명을 입력해주세요'),
    businessNumber: z.string().regex(BUSINESS_NUMBER_REGEX, '올바른 사업자등록번호 형식을 입력해주세요'),
    businessCategory: z.string().min(1, '업종을 선택해주세요'),
    contactName: z.string().min(1, '담당자명을 입력해주세요'),
    contactEmail: z.string().email('올바른 이메일 형식을 입력해주세요'),
    contactPhone: phoneSchemaRequired('담당자 휴대폰을 입력해주세요', '올바른 휴대폰 형식이 아닙니다. (예: 010-1234-5678)'),
    settlementName: z.string(),
    settlementEmail: z
      .string()
      .refine(
        (val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        '올바른 이메일 형식을 입력해주세요',
      ),
    settlementPhone: z.string(),
  })
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
