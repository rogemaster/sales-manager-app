import { describe, expect, it } from 'vitest';
import { atom, createStore } from 'jotai';
import { createFilterGroup } from './filterGroup';

describe('createFilterGroup', () => {
  it('묶음으로 만든 atom은 resetAtom 하나로 전부 기본값이 된다', () => {
    const filters = createFilterGroup();
    const statusAtom = filters.atom('ALL');
    const pageAtom = filters.atom(1);
    const committedAtom = filters.atom({ mallCode: 'ALL', searchValue: '' });
    const store = createStore();

    store.set(statusAtom, 'NEW_ORDER');
    store.set(pageAtom, 3);
    store.set(committedAtom, { mallCode: 'NSST', searchValue: '홍길동' });
    store.set(filters.resetAtom);

    expect(store.get(statusAtom)).toBe('ALL');
    expect(store.get(pageAtom)).toBe(1);
    expect(store.get(committedAtom)).toEqual({ mallCode: 'ALL', searchValue: '' });
  });

  it('묶음 밖 atom과 다른 묶음은 건드리지 않는다', () => {
    const filters = createFilterGroup();
    const other = createFilterGroup();
    const inGroupAtom = filters.atom('ALL');
    const otherGroupAtom = other.atom('ALL');
    const selectionAtom = atom<string[]>([]);
    const store = createStore();

    store.set(inGroupAtom, 'A');
    store.set(otherGroupAtom, 'B');
    store.set(selectionAtom, ['order_1']);
    store.set(filters.resetAtom);

    expect(store.get(inGroupAtom)).toBe('ALL');
    expect(store.get(otherGroupAtom)).toBe('B');
    expect(store.get(selectionAtom)).toEqual(['order_1']);
  });

  it('묶음 atom은 일반 atom처럼 함수형 업데이트를 받는다', () => {
    const filters = createFilterGroup();
    const pageAtom = filters.atom(1);
    const store = createStore();

    store.set(pageAtom, (prev) => prev + 1);

    expect(store.get(pageAtom)).toBe(2);
  });
});
