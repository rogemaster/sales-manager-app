import { faker } from '@faker-js/faker';
import { MOCK_USERS_DATA } from '../data/MockUsersData';
import { RegisterFormData } from '@/features/auth/util/registerValidation';

export const registerMockUser = (data: RegisterFormData): void => {
  const now = new Date().toISOString().split('T')[0];
  MOCK_USERS_DATA.push({
    id: `usr_${String(MOCK_USERS_DATA.length + 1).padStart(3, '0')}`,
    ownerId: null,
    status: 'active',
    email: data.email,
    password: data.password,
    name: data.contactName,
    avatar: faker.image.avatar(),
    phone: data.contactPhone,
    bio: '',
    company: data.companyName,
    location: '',
    grade: 'super_admin',
    representativeName: data.representativeName,
    businessNumber: data.businessNumber,
    businessCategory: data.businessCategory,
    businessLicenseName: '',
    contactEmail: data.contactEmail,
    settlementName: data.settlementName,
    settlementEmail: data.settlementEmail,
    settlementPhone: data.settlementPhone,
    createdAt: now,
    updatedAt: now,
  });
};
