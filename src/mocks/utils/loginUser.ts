import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const loginUser = (email: string, password: string) => {
  const user = MOCK_USERS_DATA.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...rest } = user;
  return rest;
};
