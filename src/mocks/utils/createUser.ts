import { v4 as uuidv4 } from 'uuid';
import { AccountUser, CreateUserBody } from '@/features/account/types/user.types';
import { MOCK_USERS_DATA } from '../data/MockUsersData';

export const createMockUser = (body: CreateUserBody, ownerId: string): AccountUser => {
  const now = new Date().toISOString().split('T')[0];
  const newUser = {
    id: `usr_${uuidv4()}`,
    ownerId,
    email: body.email,
    password: body.password,
    name: body.name,
    avatar: body.avatar ?? '',
    phone: body.phone,
    bio: body.bio ?? '',
    company: '',
    location: '',
    grade: body.grade,
    status: body.status,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_USERS_DATA.push(newUser);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...user } = newUser;
  return user;
};
