import { useAtomValue } from 'jotai';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { can, Permission } from '@/shared/utils/permission';

/** 화면의 버튼·섹션 노출 판단용. 정책표(permission.ts)를 읽는다 — 등급 문자열을 직접 비교하지 않는다. */
export const usePermission = (permission: Permission): boolean => can(useAtomValue(gradeAtom), permission);
