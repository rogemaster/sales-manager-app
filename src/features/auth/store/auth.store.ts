import { atom } from 'jotai';
import { User, UserGrade } from '../types/Auth';

export const idAtom = atom<string>('');
export const ownerIdAtom = atom<string | null>(null);
export const emailAtom = atom<string>('');
export const nameAtom = atom<string>('');
export const avatarAtom = atom<string>('');
export const phoneAtom = atom<string>('');
export const bioAtom = atom<string>('');
export const companyAtom = atom<string>('');
export const locationAtom = atom<string>('');
export const gradeAtom = atom<UserGrade>('operator');

export type UserWithId = User & { id: string; ownerId: string | null };

/**
 * 유저 정보 저장
 */
export const setUserInfoAtom = atom(null, (_, set, data: UserWithId) => {
  if (data) {
    set(idAtom, data.id);
    set(ownerIdAtom, data.ownerId);
    set(emailAtom, data.email);
    set(nameAtom, data.name);
    set(avatarAtom, data.avatar);
    set(phoneAtom, data.phone);
    set(bioAtom, data.bio);
    set(companyAtom, data.company);
    set(locationAtom, data.location);
    set(gradeAtom, data.grade);
  }
});

/**
 * 유저 정보 추출
 */
export const getUserInfoAtom = atom<UserWithId>((get) => ({
  id: get(idAtom),
  ownerId: get(ownerIdAtom),
  email: get(emailAtom),
  name: get(nameAtom),
  avatar: get(avatarAtom),
  phone: get(phoneAtom),
  bio: get(bioAtom),
  company: get(companyAtom),
  location: get(locationAtom),
  grade: get(gradeAtom),
}));

/**
 * 로그인한 계정의 워크스페이스 소유자 id
 * - super_admin: 자신의 id
 * - admin/operator: 자신의 ownerId (슈퍼계정 id)
 */
export const workspaceOwnerIdAtom = atom<string>((get) => {
  const id = get(idAtom);
  const ownerId = get(ownerIdAtom);
  return ownerId ?? id;
});

/**
 * 유저 정보 초기화
 */
export const resetUserInfoAtom = atom(null, (_, set) => {
  set(idAtom, '');
  set(ownerIdAtom, null);
  set(emailAtom, '');
  set(nameAtom, '');
  set(avatarAtom, '');
  set(phoneAtom, '');
  set(bioAtom, '');
  set(companyAtom, '');
  set(locationAtom, '');
  set(gradeAtom, 'operator');
});
