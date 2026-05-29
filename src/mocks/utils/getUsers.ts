import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_USERS_DATA } from '../data/MockUsersData';
import { AccountUser, GetUsersResponse, UserSearchType } from '@/features/account/types/user.types';

dayjs.extend(isBetween);

export const getMockUsers = (filters: UserSearchType, page: number, pageSize: number): GetUsersResponse => {
  const { dateType, startDate, endDate, grade, searchType, searchValue } = filters;

  const filtered = MOCK_USERS_DATA.filter((user) => {
    const dateValue = dateType === 'createdAt' ? user.createdAt : user.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (grade !== 'ALL' && user.grade !== grade) return false;
    if (searchValue) {
      const target = searchType === 'email' ? user.email : user.name;
      if (!target.toLowerCase().includes(searchValue.toLowerCase())) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const users: AccountUser[] = filtered
    .slice((page - 1) * pageSize, page * pageSize)
    .map(({ password: _password, ...user }) => user as AccountUser);

  return { users, total, page, pageSize, totalPages };
};
