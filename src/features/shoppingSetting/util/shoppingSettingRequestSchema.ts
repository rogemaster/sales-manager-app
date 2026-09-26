import { z } from 'zod';
import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { MallAddressType } from '../types/shoppingSetting.types';

/** POST /api/shopping/settings/list 요청. */
export const shoppingSettingListRequestSchema = z.object({
  filters: z.object({
    dateType: filterCodeSchema(['createdAt', 'updatedAt']),
    startDate: searchDateSchema,
    endDate: searchDateSchema,
    mallCode: filterCodeSchema([ALL_FILTER_OPTION.id, ...SHOPPING_MALL_CODES]),
    // 'ALL' 또는 쇼핑몰 계정 id. 남의 계정 id여도 owner_id 조건 때문에 0건일 뿐이다.
    mallAccountId: filterTextSchema(TEXT_LIMITS.shortText),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
  ...listPageFields,
});

const SELECT_ACCOUNT_MESSAGE = '쇼핑몰 계정을 선택해주세요.';

const ADDRESS_TYPES = ['SHIPPING', 'RETURN'] as const satisfies readonly MallAddressType[];

/** POST /api/shopping/settings/addresses 요청. */
export const mallAddressBookRequestSchema = z.object({
  mallAccountId: z
    .string({ required_error: SELECT_ACCOUNT_MESSAGE, invalid_type_error: SELECT_ACCOUNT_MESSAGE })
    .min(1, SELECT_ACCOUNT_MESSAGE),
  addressType: z.enum(ADDRESS_TYPES, { errorMap: () => ({ message: '주소 종류가 올바르지 않습니다.' }) }),
});
