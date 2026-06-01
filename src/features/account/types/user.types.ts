import { User, UserGrade } from '@/features/auth/types/Auth';

export type UserStatus = 'active' | 'pending';

export interface AccountUser extends User {
  id: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserBody extends Omit<User, 'company' | 'location'> {
  password: string;
  status: UserStatus;
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
