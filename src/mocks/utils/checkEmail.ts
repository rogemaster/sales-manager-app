import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const checkEmailAvailability = (email: string): boolean => {
  return !MOCK_USERS_DATA.some((u) => u.email === email);
};
