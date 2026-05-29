import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const deleteMockUsers = (ids: string[]): void => {
  const idSet = new Set(ids);
  for (let i = MOCK_USERS_DATA.length - 1; i >= 0; i--) {
    if (idSet.has(MOCK_USERS_DATA[i].id)) {
      MOCK_USERS_DATA.splice(i, 1);
    }
  }
};
