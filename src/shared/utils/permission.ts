import { UserGrade } from '@/features/auth/types/Auth';

/**
 * 등급별 권한 정책표 — 정본. UI(usePermission)와 API(requirePermission)가 이 표 하나를 읽는다.
 * 둘이 따로 정책을 들고 있다가 어긋난 것을 되풀이하지 않기 위해서다(2026-09-23 스펙).
 *
 * - 여기에 없는 동작은 로그인한 모든 등급에 허용한다(조회 전부, 상품·연동상품 전부).
 *   "전 등급 허용"을 키로 나열하지 않는 이유: 표만 길어지고 강제하는 것이 없다.
 * - 키는 동작 단위로 쪼갠다. 값이 같아도 합치지 않는다 — 칸 하나만 바뀌는 일이 실제로 생긴다
 *   (2026-09-23 쇼핑몰계정·정보설정 삭제에 admin 포함).
 * - 바꾸면 permission.test.ts의 기대값 표도 함께 바꾼다.
 */
export const PERMISSIONS = {
  'user.create': ['super_admin', 'admin'],
  'user.approve': ['super_admin'],
  'user.delete': ['super_admin'],

  'shoppingAccount.create': ['super_admin', 'admin'],
  'shoppingAccount.update': ['super_admin', 'admin'],
  'shoppingAccount.changeStatus': ['super_admin', 'admin'],
  'shoppingAccount.delete': ['super_admin', 'admin'],

  'shoppingSetting.create': ['super_admin', 'admin'],
  'shoppingSetting.update': ['super_admin', 'admin'],
  'shoppingSetting.changeStatus': ['super_admin', 'admin'],
  'shoppingSetting.delete': ['super_admin', 'admin'],
} as const satisfies Record<string, readonly UserGrade[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (grade: UserGrade, permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly UserGrade[]).includes(grade);
