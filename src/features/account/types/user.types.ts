import { User, UserGrade } from '@/features/auth/types/Auth';
import { PaginationMeta } from '@/types/common.type';

export type UserStatus = 'active' | 'pending';

export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;

  // 회사 정보
  representativeName: string;
  businessNumber: string;
  businessCategory: string;
  businessLicenseName: string;

  // 담당자 정보
  contactEmail: string;

  // 정산담당자 정보
  settlementName: string;
  settlementEmail: string;
  settlementPhone: string;
}

// 등록 본문은 서버 스키마에서 파생한다(grade는 SubUserGrade로 좁혀져 super_admin을 줄 수 없다).
export type { CreateUserBody } from '../util/userCreateSchema';

export interface ApproveUsersResult {
  approvedCount: number;
}

/** 사용자 목록 검색 조건. 값의 범위는 서버 스키마(userListRequestSchema)의 enum과 같다. */
export interface UserSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  grade: UserGrade | 'ALL';
  searchType: 'email' | 'name';
  searchValue: string;
}

export interface GetUsersResponse extends PaginationMeta {
  users: AccountUser[];
}
