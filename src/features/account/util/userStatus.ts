import { SubUserGrade, UserGrade } from '@/features/auth/types/Auth';
import { UserStatus } from '@/features/account/types/user.types';

const SUB_USER_GRADES: readonly SubUserGrade[] = ['admin', 'operator'];

/**
 * 새로 등록되는 사용자의 상태는 등록한 사람의 등급으로 서버가 정한다. 클라이언트가 보낸 status는 믿지 않는다.
 * super_admin이 등록하면 바로 활성, admin이 등록하면 super_admin 승인 대기(2026-05-30 사용자등록 스펙).
 * operator는 정책표상 등록할 수 없지만, 도달하더라도 안전한 쪽(pending)으로 둔다.
 */
export const resolveNewUserStatus = (creatorGrade: UserGrade): UserStatus =>
  creatorGrade === 'super_admin' ? 'active' : 'pending';

/** 사용자 등록에서 부여할 수 있는 등급인가. super_admin은 회원가입으로만 생긴다. */
export const isSubUserGrade = (value: unknown): value is SubUserGrade =>
  typeof value === 'string' && (SUB_USER_GRADES as readonly string[]).includes(value);
