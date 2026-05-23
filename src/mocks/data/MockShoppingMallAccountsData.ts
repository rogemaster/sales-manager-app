import { ShoppingMalls } from '@/types/common.type';

export interface MallAccountEntry {
  id: string;
  mallName: string;
  mallId: string;
  password: string;
  manager: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const MOCK_MALL_ACCOUNTS: Partial<Record<ShoppingMalls, MallAccountEntry[]>> = {
  AUC: [
    {
      id: 'MGA-001',
      mallName: '옥션',
      mallId: 'auction_admin1',
      password: 'auction@pw1',
      manager: { name: '홍길동', email: 'user@example.com' },
      createdAt: '2024-01-10T09:00:00',
      updatedAt: '2025-03-15T14:22:00',
    },
    {
      id: 'MGA-002',
      mallName: '옥션',
      mallId: 'auction_admin2',
      password: 'auction@pw2',
      manager: { name: '김민준', email: 'user2@example.com' },
      createdAt: '2024-03-05T10:30:00',
      updatedAt: '2025-01-20T09:10:00',
    },
    {
      id: 'MGA-003',
      mallName: '옥션',
      mallId: 'auction_admin3',
      password: 'auction@pw3',
      manager: { name: '이서연', email: 'user3@example.com' },
      createdAt: '2024-07-22T11:00:00',
      updatedAt: '2025-04-02T16:45:00',
    },
  ],
  GMK: [
    {
      id: 'MGA-004',
      mallName: '지마켓',
      mallId: 'gadmin1111',
      password: 'gmarket@pw1',
      manager: { name: '박지훈', email: 'user4@example.com' },
      createdAt: '2024-02-14T08:00:00',
      updatedAt: '2025-02-28T13:00:00',
    },
    {
      id: 'MGA-005',
      mallName: '지마켓',
      mallId: 'gadmin2222',
      password: 'gmarket@pw2',
      manager: { name: '최수아', email: 'user5@example.com' },
      createdAt: '2024-09-01T09:30:00',
      updatedAt: '2025-05-10T10:20:00',
    },
  ],
  '11ST': [
    {
      id: 'MGA-006',
      mallName: '11번가',
      mallId: 'elevenst_shop1',
      password: '11st@pw1',
      manager: { name: '정우진', email: 'user6@example.com' },
      createdAt: '2024-01-20T10:00:00',
      updatedAt: '2025-03-01T11:30:00',
    },
    {
      id: 'MGA-007',
      mallName: '11번가',
      mallId: 'elevenst_shop2',
      password: '11st@pw2',
      manager: { name: '홍길동', email: 'user@example.com' },
      createdAt: '2024-06-15T14:00:00',
      updatedAt: '2025-04-18T09:00:00',
    },
  ],
  INTP: [
    {
      id: 'MGA-008',
      mallName: '인터파크',
      mallId: 'ipark_seller',
      password: 'interpark@pw1',
      manager: { name: '김민준', email: 'user2@example.com' },
      createdAt: '2024-03-10T09:00:00',
      updatedAt: '2025-01-05T15:40:00',
    },
  ],
  NSST: [
    {
      id: 'MGA-009',
      mallName: '스마트스토어',
      mallId: 'naver_store1',
      password: 'naver@pw1',
      manager: { name: '이서연', email: 'user3@example.com' },
      createdAt: '2024-01-05T08:30:00',
      updatedAt: '2025-05-01T17:00:00',
    },
    {
      id: 'MGA-010',
      mallName: '스마트스토어',
      mallId: 'naver_store2',
      password: 'naver@pw2',
      manager: { name: '박지훈', email: 'user4@example.com' },
      createdAt: '2024-08-20T11:15:00',
      updatedAt: '2025-04-25T12:10:00',
    },
  ],
  COUP: [
    {
      id: 'MGA-011',
      mallName: '쿠팡',
      mallId: 'coupang_seller1',
      password: 'coupang@pw1',
      manager: { name: '최수아', email: 'user5@example.com' },
      createdAt: '2024-01-02T09:00:00',
      updatedAt: '2025-03-20T14:00:00',
    },
    {
      id: 'MGA-012',
      mallName: '쿠팡',
      mallId: 'coupang_seller2',
      password: 'coupang@pw2',
      manager: { name: '정우진', email: 'user6@example.com' },
      createdAt: '2024-04-11T10:00:00',
      updatedAt: '2025-02-14T09:30:00',
    },
    {
      id: 'MGA-013',
      mallName: '쿠팡',
      mallId: 'coupang_seller3',
      password: 'coupang@pw3',
      manager: { name: '홍길동', email: 'user@example.com' },
      createdAt: '2024-10-30T13:00:00',
      updatedAt: '2025-05-15T16:00:00',
    },
  ],
  CJH: [
    {
      id: 'MGA-014',
      mallName: 'CJ홈쇼핑',
      mallId: 'cjhome_seller',
      password: 'cjhome@pw1',
      manager: { name: '김민준', email: 'user2@example.com' },
      createdAt: '2024-02-28T08:00:00',
      updatedAt: '2025-01-10T10:00:00',
    },
  ],
  GSH: [
    {
      id: 'MGA-015',
      mallName: 'GS홈쇼핑',
      mallId: 'gshome_seller',
      password: 'gshome@pw1',
      manager: { name: '이서연', email: 'user3@example.com' },
      createdAt: '2024-05-07T09:30:00',
      updatedAt: '2025-03-08T11:20:00',
    },
  ],
  LOTH: [
    {
      id: 'MGA-016',
      mallName: '롯데홈쇼핑',
      mallId: 'lotte_seller',
      password: 'lotte@pw1',
      manager: { name: '박지훈', email: 'user4@example.com' },
      createdAt: '2024-04-01T10:00:00',
      updatedAt: '2025-02-20T14:30:00',
    },
  ],
  SSGC: [
    {
      id: 'MGA-017',
      mallName: 'SSG',
      mallId: 'ssg_seller1',
      password: 'ssg@pw1',
      manager: { name: '최수아', email: 'user5@example.com' },
      createdAt: '2024-03-25T09:00:00',
      updatedAt: '2025-04-10T13:45:00',
    },
    {
      id: 'MGA-018',
      mallName: 'SSG',
      mallId: 'ssg_seller2',
      password: 'ssg@pw2',
      manager: { name: '정우진', email: 'user6@example.com' },
      createdAt: '2024-11-12T11:00:00',
      updatedAt: '2025-05-20T09:00:00',
    },
  ],
  HDH: [
    {
      id: 'MGA-019',
      mallName: '현대홈쇼핑',
      mallId: 'hyundai_seller',
      password: 'hyundai@pw1',
      manager: { name: '홍길동', email: 'user@example.com' },
      createdAt: '2024-06-10T08:30:00',
      updatedAt: '2025-01-28T10:00:00',
    },
  ],
  OHOU: [
    {
      id: 'MGA-020',
      mallName: '오늘의집',
      mallId: 'ohou_seller',
      password: 'ohou@pw1',
      manager: { name: '김민준', email: 'user2@example.com' },
      createdAt: '2024-07-01T09:00:00',
      updatedAt: '2025-03-30T15:00:00',
    },
  ],
  HALF: [
    {
      id: 'MGA-021',
      mallName: '하프클럽',
      mallId: 'half_seller',
      password: 'half@pw1',
      manager: { name: '이서연', email: 'user3@example.com' },
      createdAt: '2024-08-15T10:00:00',
      updatedAt: '2025-02-05T11:00:00',
    },
  ],
  MUSIN: [
    {
      id: 'MGA-022',
      mallName: '무신사스토어',
      mallId: 'musin_seller1',
      password: 'musin@pw1',
      manager: { name: '박지훈', email: 'user4@example.com' },
      createdAt: '2024-05-20T09:30:00',
      updatedAt: '2025-04-05T14:00:00',
    },
    {
      id: 'MGA-023',
      mallName: '무신사스토어',
      mallId: 'musin_seller2',
      password: 'musin@pw2',
      manager: { name: '최수아', email: 'user5@example.com' },
      createdAt: '2024-12-01T10:30:00',
      updatedAt: '2025-05-22T09:45:00',
    },
  ],
  KAKAOS: [
    {
      id: 'MGA-024',
      mallName: '카카오스토어',
      mallId: 'kakao_shop',
      password: 'kakao@pw1',
      manager: { name: '정우진', email: 'user6@example.com' },
      createdAt: '2024-09-10T11:00:00',
      updatedAt: '2025-03-12T16:30:00',
    },
  ],
  MUST: [
    {
      id: 'MGA-025',
      mallName: '머스트잇',
      mallId: 'mustit_seller',
      password: 'mustit@pw1',
      manager: { name: '정우진', email: 'user6@example.com' },
      createdAt: '2024-10-05T08:00:00',
      updatedAt: '2025-05-18T13:20:00',
    },
  ],
};
