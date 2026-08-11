import { ProductSearch } from '@/features/products/types/product.types';
import { TRIMMED_PRODUCT_SEARCH_TYPES } from '@/features/products/constant/status.constants';

/**
 * 검색 버튼으로 필터를 확정할 때 호출한다.
 * 입력 중(draft)에는 사용자가 친 그대로 두고, 확정 시점에만 코드형 검색어의 공백을 제거한다.
 *
 * 상품목록·쇼핑몰 상품등록 두 화면이 각자의 store를 갖지만 같은 엔드포인트를 호출하므로,
 * 확정 규칙은 화면별로 복제하지 않고 여기 한 곳에 둔다.
 */
export const commitProductSearch = (filter: ProductSearch): ProductSearch => {
  if (!TRIMMED_PRODUCT_SEARCH_TYPES.includes(filter.searchType)) {
    return filter;
  }
  return { ...filter, searchValue: filter.searchValue.trim() };
};
