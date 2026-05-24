import { faker } from '@faker-js/faker';
import { UserGrade } from '@/features/auth/types/Auth';

type MockUser = {
  email: string;
  password: string;
  name: string;
  avatar: string;
  phone: string;
  bio: string;
  company: string;
  location: string;
  grade: UserGrade;
};

export const User: MockUser[] = [
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: '슈퍼관리자',
    avatar: faker.image.avatar(),
    phone: '010-1234-5678',
    bio: '슈퍼 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
    grade: 'super_admin',
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
    grade: 'admin',
  },
  {
    email: 'user2@example.com',
    password: 'user123',
    name: '김민준',
    avatar: faker.image.avatar(),
    phone: '010-1111-2222',
    bio: '일반 관리자입니다.',
    company: '앱 컴퍼니',
    location: '서울, 대한민국',
    grade: 'admin',
  },
  {
    email: 'user3@example.com',
    password: 'user123',
    name: '이서연',
    avatar: faker.image.avatar(),
    phone: '010-3333-4444',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '경기, 대한민국',
    grade: 'operator',
  },
  {
    email: 'user4@example.com',
    password: 'user123',
    name: '박지훈',
    avatar: faker.image.avatar(),
    phone: '010-5555-6666',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '인천, 대한민국',
    grade: 'operator',
  },
  {
    email: 'user5@example.com',
    password: 'user123',
    name: '최수아',
    avatar: faker.image.avatar(),
    phone: '010-7777-8888',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '부산, 대한민국',
    grade: 'operator',
  },
  {
    email: 'user6@example.com',
    password: 'user123',
    name: '정우진',
    avatar: faker.image.avatar(),
    phone: '010-9999-0000',
    bio: '운영자입니다.',
    company: '앱 컴퍼니',
    location: '대구, 대한민국',
    grade: 'operator',
  },
];
