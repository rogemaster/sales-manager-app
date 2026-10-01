import { z } from 'zod';
import dayjs from 'dayjs';
import { isYmd } from '@/shared/utils/date';
import { INVALID_IDS_MESSAGE } from '@/shared/utils/bulkRequest';
import { filterCodeSchema, filterTextSchema } from '@/shared/utils/listRequest';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { COLLECTION_SEARCH_TYPE } from '../constant/collection.constant';

/** 1회 처리 한도(제품 정책 — domain-design "규모 전제"). 백그라운드 작업자가 없어 한 요청이 끝까지 처리한다. */
export const COLLECTION_MAX_ACCOUNTS = 10;
export const COLLECTION_MAX_DAYS = 31;

export const INVALID_COLLECTION_PERIOD_MESSAGE = '수집 기간이 올바르지 않습니다.';
export const COLLECTION_PERIOD_TOO_LONG_MESSAGE = `수집 기간은 최대 ${COLLECTION_MAX_DAYS}일입니다.`;
export const COLLECTION_ACCOUNT_LIMIT_MESSAGE = `한 번에 최대 ${COLLECTION_MAX_ACCOUNTS}개 계정까지 수집할 수 있습니다.`;

/**
 * 수집 기간 규칙. 화면(요청 전 alert)과 route(400)가 이 함수 하나를 쓴다. 문제 없으면 null.
 * 일수는 시작·종료일 포함이다 — 공용 30일 버튼(오늘−30 ~ 오늘)이 31일이라 통과해야 한다.
 */
export const findCollectionPeriodProblem = (startDate: string, endDate: string): string | null => {
  if (!isYmd(startDate) || !isYmd(endDate) || startDate > endDate) return INVALID_COLLECTION_PERIOD_MESSAGE;
  const days = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  return days > COLLECTION_MAX_DAYS ? COLLECTION_PERIOD_TOO_LONG_MESSAGE : null;
};

/** POST /api/orders/collection/list. ownerId는 받지 않는다 — 세션 값만 쓴다. */
export const collectionListRequestSchema = z.object({
  filters: z.object({
    mallCode: filterCodeSchema([ALL_FILTER_OPTION.id, ...SHOPPING_MALL_CODES]),
    mallId: filterTextSchema(TEXT_LIMITS.shortText),
    searchType: filterCodeSchema(COLLECTION_SEARCH_TYPE.map(({ id }) => id)),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
});

const dateText = z.string({
  required_error: INVALID_COLLECTION_PERIOD_MESSAGE,
  invalid_type_error: INVALID_COLLECTION_PERIOD_MESSAGE,
});

/** POST /api/orders/collection/run. 같은 ID가 두 번 오면 한 번만 수집한다. */
export const runCollectionRequestSchema = z
  .object({
    accountIds: z
      .array(z.string({ invalid_type_error: INVALID_IDS_MESSAGE }), {
        required_error: INVALID_IDS_MESSAGE,
        invalid_type_error: INVALID_IDS_MESSAGE,
      })
      .transform((ids) => [...new Set(ids)])
      .refine((ids) => ids.length > 0, INVALID_IDS_MESSAGE)
      .refine((ids) => ids.length <= COLLECTION_MAX_ACCOUNTS, COLLECTION_ACCOUNT_LIMIT_MESSAGE),
    startDate: dateText,
    endDate: dateText,
  })
  .superRefine((value, ctx) => {
    const problem = findCollectionPeriodProblem(value.startDate, value.endDate);
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: problem });
  });
