import { faker } from '@faker-js/faker';

export const testUsers = [
  {
    email: "admin@example.com",
    password: "admin123",
    name: "관리자",
    avatar: faker.image.avatar(),
    phone: "010-1234-5678",
    bio: "시스템 관리자입니다.",
    company: "MyApp",
    location: "서울, 대한민국",
  },
  {
    email: "user@example.com",
    password: "user123",
    name: "홍길동",
    avatar: faker.image.avatar(),
    phone: "010-9876-5432",
    bio: "일반 사용자입니다.",
    company: "테크 컴퍼니",
    location: "부산, 대한민국",
  },
]