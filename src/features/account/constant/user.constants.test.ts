import { describe, it, expect } from 'vitest';
import { getGradeLabel, SUB_USER_GRADE_OPTIONS } from './user.constants';

describe('getGradeLabel', () => {
  it('등급 코드를 화면 이름으로 바꾼다', () => {
    expect(getGradeLabel('super_admin')).toBe('슈퍼관리자');
    expect(getGradeLabel('operator')).toBe('운영자');
  });

  it('모르는 값은 그대로 보여준다', () => {
    expect(getGradeLabel('owner')).toBe('owner');
  });
});

describe('SUB_USER_GRADE_OPTIONS', () => {
  it('super_admin을 뺀 등급만 담는다 — 사용자 등록에서 고를 수 있는 등급', () => {
    expect(SUB_USER_GRADE_OPTIONS.map(({ id }) => id)).toEqual(['admin', 'operator']);
  });
});
