import { User, UserGrade, SubUserGrade } from '@/features/auth/types/Auth';

export type UserStatus = 'active' | 'pending';

export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  /** null: 직접 가입한 슈퍼계정 / string: 종속된 슈퍼계정의 id */
  ownerId: string | null;
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

export interface CreateUserBody extends Omit<User, 'company' | 'location' | 'grade'> {
  password: string;
  status: UserStatus;
  grade: SubUserGrade;
}

export interface UserSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  grade: UserGrade | 'ALL';
  searchType: string;
  searchValue: string;
}

export interface GetUsersResponse {
  users: AccountUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
