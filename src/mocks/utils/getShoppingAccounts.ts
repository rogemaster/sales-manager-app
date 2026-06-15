import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '@/features/shoppingAccount/types/shoppingAccount.types';

dayjs.extend(isBetween);

export const getMockShoppingAccounts = (
  ownerId: string,
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize: number,
): GetShoppingAccountsResponse => {
  const { dateType, startDate, endDate, isActive, mallCode, searchValue } = filters;

  const filtered = MOCK_SHOPPING_ACCOUNTS_DATA.filter((account) => {
    if (account.ownerId !== ownerId) return false;
    const dateValue = dateType === 'createdAt' ? account.createdAt : account.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (isActive !== 'ALL' && account.isActive !== (isActive === 'true')) return false;
    if (mallCode !== 'ALL' && account.mallCode !== mallCode) return false;
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      const matches =
        account.mallId.toLowerCase().includes(keyword) ||
        account.nickname.toLowerCase().includes(keyword);
      if (!matches) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const accounts = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { accounts, total, page, pageSize, totalPages };
};
