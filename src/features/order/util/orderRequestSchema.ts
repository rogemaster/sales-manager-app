import { z } from 'zod';
import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { DELIVERY_COMPANY } from '@/shared/constant/delivery.constant';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';
import { bulkIdsRequestSchema } from '@/shared/utils/bulkRequest';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';
import { ORDER_DATE_TYPE, ORDER_SEARCH_TYPE, ORDER_STATUS, ORDER_STATUS_CODES } from '../constant/status.constants';
import { INVALID_ORDER_STATUS_MESSAGE } from './orderStatusRule';

const withAll = (options: { id: string }[]) => [ALL_FILTER_OPTION.id, ...options.map(({ id }) => id)];

/** POST /api/orders/list 요청. ownerId는 받지 않는다 — 세션 값만 쓴다. */
export const orderListRequestSchema = z.object({
  filters: z.object({
    dateType: filterCodeSchema(ORDER_DATE_TYPE.map(({ id }) => id)),
    startDate: searchDateSchema,
    endDate: searchDateSchema,
    mallCode: filterCodeSchema([ALL_FILTER_OPTION.id, ...SHOPPING_MALL_CODES]),
    // 'ALL' 또는 계정 id. 남의 id여도 owner_id 조건 때문에 0건일 뿐이다.
    mallId: filterTextSchema(TEXT_LIMITS.shortText),
    deliveryCompany: filterCodeSchema(withAll(DELIVERY_COMPANY)),
    orderStatus: filterCodeSchema(withAll(ORDER_STATUS)),
    searchType: filterCodeSchema(ORDER_SEARCH_TYPE.map(({ id }) => id)),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
  ...listPageFields,
});

/** POST /api/orders/status 요청. ids 누락은 400이다 — 0건으로 답하면 "대상 없음" 거짓 안내가 뜬다(msw-rules.md). */
export const orderStatusBulkRequestSchema = bulkIdsRequestSchema.extend({
  orderStatus: z.enum(ORDER_STATUS_CODES, { errorMap: () => ({ message: INVALID_ORDER_STATUS_MESSAGE }) }),
});

const ORDER_COMMENT_EMPTY_MESSAGE = '코멘트를 입력해주세요.';

export const orderCommentRequestSchema = z.object({
  content: z
    .string({ required_error: ORDER_COMMENT_EMPTY_MESSAGE, invalid_type_error: ORDER_COMMENT_EMPTY_MESSAGE })
    .trim()
    .min(1, ORDER_COMMENT_EMPTY_MESSAGE)
    .max(TEXT_LIMITS.longText, maxLengthMessage(TEXT_LIMITS.longText)),
});

/** ilike 부분일치용. Postgres LIKE의 기본 이스케이프 문자는 \ 다 — 이스케이프하지 않으면 '50%'가 '50으로 시작'이 된다. */
export const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);
