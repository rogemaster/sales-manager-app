import { describe, it, expect } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import { mergeProductSnapshot } from './mergeProductSnapshot';

const CURRENT = {
  productId: 'p_001',
  name: '원본 상품명',
  price: 10000,
  brand: '원본 브랜드',
  modelName: '원본 모델',
  informationDisclosure: { key: 'wear', id: 'd_01', name: '의류', fields: { 제조자: '원본제조사' } },
} as unknown as Product;

describe('mergeProductSnapshot', () => {
  it('보낸 키만 덮고 나머지는 유지한다', () => {
    const merged = mergeProductSnapshot(CURRENT, { price: 20000 }, undefined);
    expect(merged.price).toBe(20000);
    expect(merged.name).toBe('원본 상품명');
  });

  it('clearKeys의 선택 키는 지운다', () => {
    const merged = mergeProductSnapshot(CURRENT, undefined, ['modelName']);
    expect('modelName' in merged).toBe(false);
  });

  it('clearKeys에 필수 키가 와도 지우지 않는다', () => {
    const merged = mergeProductSnapshot(CURRENT, undefined, ['name', 'price']);
    expect(merged.name).toBe('원본 상품명');
    expect(merged.price).toBe(10000);
  });

  it('patch의 중첩 객체를 공유하지 않는다', () => {
    const patch = { informationDisclosure: { key: 'k', id: 'd_02', name: '식품', fields: { a: '1' } } };
    const merged = mergeProductSnapshot(CURRENT, patch, undefined);
    patch.informationDisclosure.fields.a = '변조';
    expect(merged.informationDisclosure.fields.a).toBe('1');
  });

  it('원본을 변형하지 않는다', () => {
    mergeProductSnapshot(CURRENT, { price: 1 }, ['modelName']);
    expect(CURRENT.price).toBe(10000);
    expect(CURRENT.modelName).toBe('원본 모델');
  });
});
