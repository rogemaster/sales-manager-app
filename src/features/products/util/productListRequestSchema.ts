import { z } from 'zod';
import { FilterOption } from '@/types/common.type';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { PRODUCT_DATE_TYPE, PRODUCT_SEARCH_TYPE, PRODUCT_STATUS } from '@/features/products/constant/status.constants';

const ids = (options: FilterOption[]) => options.map(({ id }) => id);

/** POST /api/products/list 요청. 상품목록과 쇼핑몰 상품등록 화면이 같은 요청을 보낸다. */
export const productListRequestSchema = z.object({
  dateType: filterCodeSchema(ids(PRODUCT_DATE_TYPE)),
  startDate: searchDateSchema,
  endDate: searchDateSchema,
  saleType: filterCodeSchema([ALL_FILTER_OPTION.id, ...ids(PRODUCT_STATUS)]),
  categoryId: filterTextSchema(TEXT_LIMITS.shortText),
  searchType: filterCodeSchema(ids(PRODUCT_SEARCH_TYPE)),
  searchValue: filterTextSchema(TEXT_LIMITS.search),
  ...listPageFields,
});
