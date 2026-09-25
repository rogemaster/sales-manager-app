import { Category } from '@/types/common.type';

/**
 * 상품 카테고리(가입 업종 선택에도 쓴다).
 * 예전에는 src/mocks/data/MockCategoryData.ts에 있었다 — 운영 화면이 mocks를 import하면
 * 주문 영역 DB화로 mocks를 지울 때 가입·상품 폼이 함께 깨지므로 여기로 옮겼다(2026-09-26).
 */
export const CATEGORIES: Category[] = [
  { id: 'c00001', name: '의류' },
  { id: 'c00002', name: '패션잡화' },
  { id: 'c00003', name: '뷰티' },
  { id: 'c00004', name: '유아동' },
  { id: 'c00005', name: '식품' },
  { id: 'c00006', name: '생필품' },
  { id: 'c00007', name: '홈데코' },
  { id: 'c00008', name: '문구' },
  { id: 'c00009', name: '취미' },
  { id: 'c00010', name: '컴퓨터' },
  { id: 'c00011', name: '가전' },
  { id: 'c00012', name: '스포츠' },
];

export const getCategoryName = (id: string): string | undefined =>
  CATEGORIES.find((category) => category.id === id)?.name;
