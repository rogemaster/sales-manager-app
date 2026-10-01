import { CollectionSearchKey } from '../types/collection.types';

/** 수집 화면 검색어 유형. 수집자(이름·이메일 부분일치)만 있다. */
export const COLLECTION_SEARCH_TYPE: { id: CollectionSearchKey; name: string }[] = [
  { id: 'collectedBy', name: '수집자' },
];
