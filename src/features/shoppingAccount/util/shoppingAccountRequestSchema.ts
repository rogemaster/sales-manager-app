import { z } from 'zod';
import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';

/** POST /api/shopping/accounts/list 요청. */
export const shoppingAccountListRequestSchema = z.object({
  filters: z.object({
    dateType: filterCodeSchema(['createdAt', 'updatedAt']),
    startDate: searchDateSchema,
    endDate: searchDateSchema,
    // 사용여부 Select의 값이 문자열이다(ShoppingAccountSearchType.isActive).
    isActive: filterCodeSchema([ALL_FILTER_OPTION.id, 'true', 'false']),
    mallCode: filterCodeSchema([ALL_FILTER_OPTION.id, ...SHOPPING_MALL_CODES]),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
  ...listPageFields,
});

/** POST /api/shopping/accounts/by-mall 요청. 없는 몰 코드는 빈 목록이 아니라 400이다. */
export const shoppingAccountsByMallRequestSchema = z.object({
  mallCode: z.enum(SHOPPING_MALL_CODES as [string, ...string[]], {
    errorMap: () => ({ message: '쇼핑몰 값이 올바르지 않습니다.' }),
  }),
});
