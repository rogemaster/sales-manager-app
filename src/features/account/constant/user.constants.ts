import { FilterOption, TableTitleValue } from '@/types/common.type';
import { SUB_USER_GRADES } from '@/features/auth/constant/grade.constant';

export const USER_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const USER_GRADE_OPTIONS: FilterOption[] = [
  { id: 'super_admin', name: '슈퍼관리자' },
  { id: 'admin', name: '일반관리자' },
  { id: 'operator', name: '운영자' },
];

/** 등급 코드 → 화면 이름. 목록에 없는 값은 코드를 그대로 보여준다. */
export const getGradeLabel = (grade: string): string =>
  USER_GRADE_OPTIONS.find((option) => option.id === grade)?.name ?? grade;

/** 사용자 등록에서 고를 수 있는 등급 옵션. super_admin은 가입으로만 생긴다. */
export const SUB_USER_GRADE_OPTIONS: FilterOption[] = USER_GRADE_OPTIONS.filter((option) =>
  (SUB_USER_GRADES as readonly string[]).includes(option.id),
);

export const USER_SEARCH_TYPE: FilterOption[] = [
  { id: 'email', name: '이메일' },
  { id: 'name', name: '이름' },
];

export const USER_STATUS_OPTIONS: FilterOption[] = [
  { id: 'active', name: '활성' },
  { id: 'pending', name: '승인대기' },
];

export const USER_TABLE_HEAD: TableTitleValue[] = [
  { id: 'grade', title: '등급' },
  { id: 'status', title: '상태' },
  { id: 'email', title: '이메일' },
  { id: 'name', title: '이름' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
