import { ProductSearch } from '@/features/products/types/product.types';
import { TRIMMED_PRODUCT_SEARCH_TYPES } from '@/features/products/constant/status.constants';

export const commitProductSearch = (filter: ProductSearch): ProductSearch => {
  if (!TRIMMED_PRODUCT_SEARCH_TYPES.includes(filter.searchType)) {
    return filter;
  }
  return { ...filter, searchValue: filter.searchValue.trim() };
};
