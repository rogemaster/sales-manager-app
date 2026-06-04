import { z } from 'zod';

export const PHONE_REGEX = /^(0[0-9]{1,2})-?([0-9]{3,4})-?([0-9]{4})$/;

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const phoneSchemaRequired = (
  emptyMessage = '연락처를 입력해주세요.',
  formatMessage = '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)',
) => z.string().min(1, emptyMessage).regex(PHONE_REGEX, formatMessage);
