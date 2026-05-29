import { User, UserGrade } from '@/features/auth/types/Auth';

export interface AccountUser extends User {
  id: string;
  createdAt: string;
  updatedAt: string;
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
