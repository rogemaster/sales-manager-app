import { FilterOption, TableTitleValue } from '@/types/common.type';

export const USER_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const ALL_USER_GRADE: FilterOption = { id: 'ALL', name: '전체' };

export const USER_GRADE_OPTIONS: FilterOption[] = [
  { id: 'super_admin', name: '슈퍼관리자' },
  { id: 'admin', name: '일반관리자' },
  { id: 'operator', name: '운영자' },
];

export const USER_SEARCH_TYPE: FilterOption[] = [
  { id: 'email', name: '이메일' },
  { id: 'name', name: '이름' },
];

export const USER_TABLE_HEAD: TableTitleValue[] = [
  { id: 'grade', title: '등급' },
  { id: 'email', title: '이메일' },
  { id: 'name', title: '이름' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
