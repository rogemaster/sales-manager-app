import { User } from '@/features/auth/types/Auth';
import { MOCK_USERS_DATA } from '../data/MockUsersData';

type UpdateProfileBody = {
  email: string;
  name: string;
  phone: string;
  company?: string;
  bio?: string;
};

export const updateMockProfile = (body: UpdateProfileBody): User | null => {
  const index = MOCK_USERS_DATA.findIndex((u) => u.email === body.email);
  if (index === -1) return null;

  MOCK_USERS_DATA[index] = {
    ...MOCK_USERS_DATA[index],
    name: body.name,
    phone: body.phone,
    company: body.company ?? MOCK_USERS_DATA[index].company,
    bio: body.bio ?? MOCK_USERS_DATA[index].bio,
  };

  const { email, name, avatar, phone, bio, company, location, grade } = MOCK_USERS_DATA[index];
  return { email, name, avatar, phone, bio, company, location, grade };
};
