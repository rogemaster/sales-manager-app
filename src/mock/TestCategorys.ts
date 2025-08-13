import { Category } from '@/types/CommonInterface';

// 전체 카테고리 옵션 상수
export const ALL_CATEGORY_OPTION = {
  code: 'ALL',
  name: '전체',
} as const;

export const MOCK_CATEGORY_DATA: Category[] = [
  {
    code: 'c00001',
    name: '의류',
  },
  {
    code: 'c00002',
    name: '패션잡화',
  },
  {
    code: 'c00003',
    name: '뷰티',
  },
  {
    code: 'c00004',
    name: '유아동',
  },
  {
    code: 'c00005',
    name: '식품',
  },
  {
    code: 'c00006',
    name: '생필품',
  },
  {
    code: 'c00007',
    name: '홈데코',
  },
  {
    code: 'c00008',
    name: '문구',
  },
  {
    code: 'c00009',
    name: '취미',
  },
  {
    code: 'c00010',
    name: '컴퓨터',
  },
  {
    code: 'c00011',
    name: '가전',
  },
  {
    code: 'c00012',
    name: '스포츠',
  },
];
