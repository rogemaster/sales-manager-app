/**
 * 검색 필터를 유지하는 메뉴 범위. 메뉴 = 사이드바 항목(`sidebarMenu.constant.ts`)이고, 그 목록 화면과 하위 화면(상세·등록)이 범위다.
 * 범위 안에서 움직이면 필터를 유지하고, 범위를 벗어나면 `SearchFilterScopeReset`이 그 store를 초기화한다(2026-10-04 사용자 결정).
 * 새 목록 화면을 만들면 여기에 범위를 추가하고, `SearchFilterScopeReset`에 store의 `resetAtom`을 연결한다.
 */

/** base 자신과 그 아래 모든 경로. 'base-other' 같은 접두어만 같은 경로는 제외한다. */
const under = (base: string) => (path: string) => path === base || path.startsWith(`${base}/`);

/** 목록 경로 + 한 단계 상세(`/base/:id`). 같은 깊이에 있는 다른 사이드바 메뉴는 상세가 아니다. */
const listWithDetail =
  (listPath: string, base: string, siblingMenus: string[]) =>
  (path: string): boolean => {
    if (path === listPath) return true;
    const rest = path.startsWith(`${base}/`) ? path.slice(base.length + 1) : '';
    return rest !== '' && !rest.includes('/') && !siblingMenus.includes(rest);
  };

const FILTER_SCOPES = {
  products: listWithDetail('/products/list', '/products', ['list', 'create', 'bulk']),
  mallRegistration: under('/shopping/register'),
  shoppingAccount: under('/shopping/accounts'),
  shoppingSetting: under('/shopping/settings'),
  mallLinkedProduct: under('/shopping/linked-products'),
  order: listWithDetail('/order/list', '/order', ['list', 'collect', 'create']),
  orderCollect: under('/order/collect'),
  account: under('/account/user'),
} satisfies Record<string, (path: string) => boolean>;

export type FilterScopeId = keyof typeof FILTER_SCOPES;

export const FILTER_SCOPE_IDS = Object.keys(FILTER_SCOPES) as FilterScopeId[];

export const isInFilterScope = (id: FilterScopeId, path: string): boolean => FILTER_SCOPES[id](path);

/** 이전 경로는 범위 안이고 새 경로는 범위 밖인 범위 — 이번 이동으로 벗어난 메뉴. */
export const getFilterScopesToReset = (prevPath: string, nextPath: string): FilterScopeId[] =>
  FILTER_SCOPE_IDS.filter((id) => isInFilterScope(id, prevPath) && !isInFilterScope(id, nextPath));
