import { faker } from '@faker-js/faker';
import { MOCK_USERS_DATA } from '../data/MockUsersData';
import { RegisterFormData } from '@/features/auth/util/registerValidation';

export const registerMockUser = (data: RegisterFormData): void => {
  MOCK_USERS_DATA.push({
    id: `usr_${String(MOCK_USERS_DATA.length + 1).padStart(3, '0')}`,
    status: 'active',
    email: data.email,
    password: data.password,
    name: data.contactName,
    avatar: faker.image.avatar(),
    phone: data.contactPhone,
    bio: '',
    company: data.companyName,
    location: '',
    grade: 'operator',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  });
};
