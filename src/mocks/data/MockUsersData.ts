import { faker } from '@faker-js/faker';

export const User = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: '슈퍼관리자',
    avatar: faker.image.avatar(),
    phone: '010-1234-5678',
    bio: '슈퍼 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
  },
  {
    email: 'user@example.com',
    password: 'user123',
    name: '홍길동',
    avatar: faker.image.avatar(),
    phone: '010-9876-5432',
    bio: '일반 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
  },
];
