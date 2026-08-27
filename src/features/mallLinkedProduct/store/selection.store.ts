import { atom } from 'jotai';

// 목록에서 체크된 연동 데이터 id (MallLinkedProduct.id).
export const selectedLinkedIdsAtom = atom<string[]>([]);

// 쇼핑몰 정보설정 적용 모달의 열림 상태. 선택한 건들에 대해 동작하므로 선택 store에 함께 둔다.
export const isSettingApplyModalOpenAtom = atom<boolean>(false);
