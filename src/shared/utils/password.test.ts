import { describe, it, expect } from 'vitest';
import { isValidPassword, passwordSchema, PASSWORD_RULE_MESSAGE } from './password';

describe('isValidPassword', () => {
  it('영어·숫자·특수문자 조합 9자 이상이면 통과한다', () => {
    expect(isValidPassword('admin123@')).toBe(true);
  });

  it('8자면 조합이 맞아도 거부한다', () => {
    expect(isValidPassword('admin12@')).toBe(false);
  });

  it('특수문자가 없으면 거부한다', () => {
    expect(isValidPassword('admin12345')).toBe(false);
  });

  it('숫자가 없으면 거부한다', () => {
    expect(isValidPassword('adminadmin@')).toBe(false);
  });

  it('영어가 없으면 거부한다', () => {
    expect(isValidPassword('123456789@')).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('규칙을 어기면 규칙 안내 문구로 거부한다', () => {
    const result = passwordSchema.safeParse('secret1');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(PASSWORD_RULE_MESSAGE);
  });

  it('규칙을 지키면 통과한다', () => {
    expect(passwordSchema.safeParse('admin123@').success).toBe(true);
  });
});
