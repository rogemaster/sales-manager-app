import { describe, it, expect } from 'vitest';
import { UserGrade } from '@/features/auth/types/Auth';
import { can, Permission, PERMISSIONS } from './permission';

// 스펙 3절 정책표를 그대로 옮긴 기대값. PERMISSIONS를 복사하지 말고 표를 보고 적는다.
const EXPECTED: Record<Permission, Record<UserGrade, boolean>> = {
  'user.create': { super_admin: true, admin: true, operator: false },
  'user.approve': { super_admin: true, admin: false, operator: false },
  'user.delete': { super_admin: true, admin: false, operator: false },

  'shoppingAccount.create': { super_admin: true, admin: true, operator: false },
  'shoppingAccount.update': { super_admin: true, admin: true, operator: false },
  'shoppingAccount.changeStatus': { super_admin: true, admin: true, operator: false },
  'shoppingAccount.delete': { super_admin: true, admin: true, operator: false },

  'shoppingSetting.create': { super_admin: true, admin: true, operator: false },
  'shoppingSetting.update': { super_admin: true, admin: true, operator: false },
  'shoppingSetting.changeStatus': { super_admin: true, admin: true, operator: false },
  'shoppingSetting.delete': { super_admin: true, admin: true, operator: false },
};

const GRADES: UserGrade[] = ['super_admin', 'admin', 'operator'];

describe('can', () => {
  it('정책표와 기대값의 키 집합이 같다', () => {
    expect(Object.keys(PERMISSIONS).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  const cases = (Object.keys(EXPECTED) as Permission[]).flatMap((permission) =>
    GRADES.map((grade) => ({ permission, grade, expected: EXPECTED[permission][grade] })),
  );

  it.each(cases)('$grade · $permission → $expected', ({ permission, grade, expected }) => {
    expect(can(grade, permission)).toBe(expected);
  });
});
