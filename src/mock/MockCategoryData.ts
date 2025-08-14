import { Category } from '@/types/CommonInterface';

// 전체 카테고리 옵션 상수
export const ALL_CATEGORY_OPTION = {
  id: 'ALL',
  name: '전체',
} as const;

export const MOCK_CATEGORY_DATA: Category[] = [
  {
    id: 'c00001',
    name: '의류',
  },
  {
    id: 'c00002',
    name: '패션잡화',
  },
  {
    id: 'c00003',
    name: '뷰티',
  },
  {
    id: 'c00004',
    name: '유아동',
  },
  {
    id: 'c00005',
    name: '식품',
  },
  {
    id: 'c00006',
    name: '생필품',
  },
  {
    id: 'c00007',
    name: '홈데코',
  },
  {
    id: 'c00008',
    name: '문구',
  },
  {
    id: 'c00009',
    name: '취미',
  },
  {
    id: 'c00010',
    name: '컴퓨터',
  },
  {
    id: 'c00011',
    name: '가전',
  },
  {
    id: 'c00012',
    name: '스포츠',
  },
] as const;
