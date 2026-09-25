import { describe, it, expect } from 'vitest';
import { validateAuthForm } from './Validators';
import { ERROR_MESSAGE } from '../constant/errorMessage';

// ─── validateAuthForm ─────────────────────────────────────────────────────────

describe('validateAuthForm', () => {
  describe('유효한 입력', () => {
    it('올바른 이메일과 비밀번호면 isValid가 true다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: 'admin123@' });
      expect(result.isValid).toBe(true);
    });

    it('유효한 경우 error 객체가 비어있다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: 'admin123@' });
      expect(result.error).toEqual({});
    });
  });

  describe('이메일 검증', () => {
    it('이메일이 빈 문자열이면 이메일 에러를 반환한다', () => {
      const result = validateAuthForm({ email: '', password: 'pass123' });
      expect(result.isValid).toBe(false);
      expect(result.error.email).toBe(ERROR_MESSAGE.NOT_FOUND_EMAIL);
    });

    it('이메일이 공백만 있어도 빈 값으로 처리한다', () => {
      const result = validateAuthForm({ email: '   ', password: 'pass123' });
      expect(result.isValid).toBe(false);
      expect(result.error.email).toBe(ERROR_MESSAGE.NOT_FOUND_EMAIL);
    });

    it('@가 없는 이메일은 형식 오류를 반환한다', () => {
      const result = validateAuthForm({ email: 'notanemail', password: 'pass123' });
      expect(result.isValid).toBe(false);
      expect(result.error.email).toBe(ERROR_MESSAGE.INVALID_EMAIL_FORMAT);
    });

    it('도메인이 없는 이메일은 형식 오류를 반환한다', () => {
      const result = validateAuthForm({ email: 'user@', password: 'pass123' });
      expect(result.isValid).toBe(false);
      expect(result.error.email).toBe(ERROR_MESSAGE.INVALID_EMAIL_FORMAT);
    });
  });

  describe('비밀번호 검증', () => {
    it('비밀번호가 빈 문자열이면 비밀번호 에러를 반환한다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: '' });
      expect(result.isValid).toBe(false);
      expect(result.error.password).toBe(ERROR_MESSAGE.NOT_FOUND_PASSWORD);
    });

    it('비밀번호가 공백만 있어도 빈 값으로 처리한다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.error.password).toBe(ERROR_MESSAGE.NOT_FOUND_PASSWORD);
    });

    it('비밀번호가 5자면 형식 오류를 반환한다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: '12345' });
      expect(result.isValid).toBe(false);
      expect(result.error.password).toBe(ERROR_MESSAGE.INVALID_PASSWORD_FORMAT);
    });

    it('6자 영문·숫자만으로는 형식 오류다 — 가입과 같은 규칙', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: 'pass123' });
      expect(result.error.password).toBe(ERROR_MESSAGE.INVALID_PASSWORD_FORMAT);
    });

    it('영어·숫자·특수문자 조합 9자면 유효하다', () => {
      const result = validateAuthForm({ email: 'user@example.com', password: 'admin123@' });
      expect(result.error.password).toBeUndefined();
    });
  });

  describe('복수 오류', () => {
    it('이메일과 비밀번호 모두 비어있으면 두 에러가 모두 반환된다', () => {
      const result = validateAuthForm({ email: '', password: '' });
      expect(result.isValid).toBe(false);
      expect(result.error.email).toBeDefined();
      expect(result.error.password).toBeDefined();
    });
  });
});

describe('이메일 형식 오류 문구', () => {
  it('형식 오류는 계정 불일치가 아니라 형식 안내 문구다', () => {
    expect(ERROR_MESSAGE.INVALID_EMAIL_FORMAT).toBe('올바른 이메일 형식을 입력해주세요');
    expect(ERROR_MESSAGE.INVALID_EMAIL_FORMAT).not.toBe(ERROR_MESSAGE.NOT_FOUND_USER);
  });
});
