import { atom } from 'jotai';
import { User } from '../types/Auth';

export const emailAtom = atom<string>('');
export const nameAtom = atom<string>('');
export const avatarAtom = atom<string>('');
export const phoneAtom = atom<string>('');
export const bioAtom = atom<string>('');
export const companyAtom = atom<string>('');
export const locationAtom = atom<string>('');

/**
 * 유저 정보 저장
 */
export const setUserInfoAtom = atom(null, (_, set, data: User) => {
  if (data) {
    set(emailAtom, data.email);
    set(nameAtom, data.name);
    set(avatarAtom, data.avatar);
    set(phoneAtom, data.phone);
    set(bioAtom, data.bio);
    set(companyAtom, data.company);
    set(locationAtom, data.location);
  }
});

/**
 * 유저 정보 추출
 */
export const getUserInfoAtom = atom<User>(get =>({
  email: get(emailAtom),
  name: get(nameAtom),
  avatar: get(avatarAtom),
  phone: get(phoneAtom),
  bio: get(bioAtom),
  company: get(companyAtom),
  location: get(locationAtom)
}));
