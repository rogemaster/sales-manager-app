import { atom } from 'jotai';

// 목록에서 체크된 연동 데이터 id (MallLinkedProduct.id).
export const selectedLinkedIdsAtom = atom<string[]>([]);
