import { describe, it, expect } from 'vitest';
import { EMAIL_FORMAT_MESSAGE, EMAIL_REGEX, emailSchema } from './email';

describe('EMAIL_REGEX', () => {
  it.each(['user@example.com', 'a.b@c.co.kr'])('%s는 이메일이다', (value) => {
    expect(EMAIL_REGEX.test(value)).toBe(true);
  });

  it.each(['', 'user@', 'user@example', 'user example@a.com'])('%s는 이메일이 아니다', (value) => {
    expect(EMAIL_REGEX.test(value)).toBe(false);
  });
});

describe('emailSchema', () => {
  it('형식이 틀리면 공통 문구로 거부한다', () => {
    const result = emailSchema.safeParse('not-an-email');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(EMAIL_FORMAT_MESSAGE);
  });

  it('길이 상한을 넘으면 거부한다', () => {
    expect(emailSchema.safeParse(`${'a'.repeat(250)}@example.com`).success).toBe(false);
  });

  it('올바른 이메일은 통과한다', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
  });
});
