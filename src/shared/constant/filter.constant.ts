import { FilterOption } from '@/types/common.type';

/**
 * 필터 Select의 '전체' 옵션.
 * 도메인마다 같은 값을 다른 이름으로 재정의하던 것을 하나로 모았다.
 * (id는 'ALL' 고정 — 검색 필터 타입들이 `T | 'ALL'` 형태로 이 값을 전제한다)
 */
export const ALL_FILTER_OPTION: FilterOption = { id: 'ALL', name: '전체' };
