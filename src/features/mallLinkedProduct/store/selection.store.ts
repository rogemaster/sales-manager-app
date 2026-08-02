import { atom } from 'jotai';

/**
 * 목록에서 체크된 연동 데이터 id (MallLinkedProduct.id).
 * 현재 화면에 보이는 페이지 기준으로만 유지하며, 페이지 이동·재검색 시 초기화한다.
 * (다른 페이지의 id가 남아 있으면 이후 일괄 액션이 보이지 않는 행까지 건드리게 된다)
 */
export const selectedLinkedIdsAtom = atom<string[]>([]);
