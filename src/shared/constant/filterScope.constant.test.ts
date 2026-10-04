import { describe, expect, it } from 'vitest';
import { FILTER_SCOPE_IDS, FilterScopeId, getFilterScopesToReset, isInFilterScope } from './filterScope.constant';

const IN_SCOPE: Record<FilterScopeId, string[]> = {
  products: ['/products/list', '/products/prod_1a2b3c4d'],
  mallRegistration: ['/shopping/register'],
  shoppingAccount: ['/shopping/accounts', '/shopping/accounts/create', '/shopping/accounts/sa_1a2b3c4d'],
  shoppingSetting: ['/shopping/settings', '/shopping/settings/create', '/shopping/settings/set_1'],
  mallLinkedProduct: [
    '/shopping/linked-products',
    '/shopping/linked-products/mlp_1',
    '/shopping/linked-products/bulk-edit/product',
  ],
  order: ['/order/list', '/order/order_1a2b3c4d'],
  orderCollect: ['/order/collect'],
  account: ['/account/user', '/account/user/create'],
};

const OUT_OF_SCOPE: Record<FilterScopeId, string[]> = {
  products: ['/products/create', '/products/bulk', '/products', '/home', '/shopping/register'],
  mallRegistration: ['/shopping/register-other', '/products/list', '/shopping/linked-products'],
  shoppingAccount: ['/shopping/accounts-old', '/shopping/settings', '/home'],
  shoppingSetting: ['/shopping/accounts', '/home'],
  mallLinkedProduct: ['/shopping/register', '/shopping/settings'],
  order: ['/order/collect', '/order/create', '/order', '/order/list/extra', '/home'],
  orderCollect: ['/order/list', '/order/order_1'],
  account: ['/account', '/profile/edit', '/home'],
};

describe('isInFilterScope', () => {
  it.each(FILTER_SCOPE_IDS)('%s — 목록과 그 하위 화면은 범위 안이다', (id) => {
    IN_SCOPE[id].forEach((path) => expect(isInFilterScope(id, path), path).toBe(true));
  });

  it.each(FILTER_SCOPE_IDS)('%s — 다른 메뉴는 범위 밖이다', (id) => {
    OUT_OF_SCOPE[id].forEach((path) => expect(isInFilterScope(id, path), path).toBe(false));
  });
});

describe('getFilterScopesToReset', () => {
  it('같은 메뉴의 상세에 다녀오면 초기화하지 않는다', () => {
    expect(getFilterScopesToReset('/order/list', '/order/order_1')).toEqual([]);
    expect(getFilterScopesToReset('/order/order_1', '/order/list')).toEqual([]);
    expect(getFilterScopesToReset('/products/list', '/products/prod_1')).toEqual([]);
    expect(getFilterScopesToReset('/shopping/accounts', '/shopping/accounts/create')).toEqual([]);
  });

  it('메뉴를 벗어나면 벗어난 메뉴만 초기화한다', () => {
    expect(getFilterScopesToReset('/order/list', '/products/list')).toEqual(['order']);
    expect(getFilterScopesToReset('/order/order_1', '/order/collect')).toEqual(['order']);
    expect(getFilterScopesToReset('/products/prod_1', '/products/create')).toEqual(['products']);
  });

  it('범위가 없는 화면에서 들어오거나 같은 경로면 초기화하지 않는다', () => {
    expect(getFilterScopesToReset('/home', '/order/list')).toEqual([]);
    expect(getFilterScopesToReset('/order/list', '/order/list')).toEqual([]);
  });
});
