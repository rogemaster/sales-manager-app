import { z } from 'zod';
import { USER_GRADES } from '@/features/auth/constant/grade.constant';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';

/**
 * POST /api/account/users/list 요청. 폼이 없는 서버 전용 스키마다.
 * users.created_at·updated_at은 text 'YYYY-MM-DD'라 같은 모양의 문자열끼리 사전순 비교한다 —
 * searchDateSchema(isYmd)는 모양뿐 아니라 2월 31일 같은 없는 날짜도 거른다.
 */
export const userListRequestSchema = z.object({
  filters: z.object({
    dateType: filterCodeSchema(['createdAt', 'updatedAt']),
    startDate: searchDateSchema,
    endDate: searchDateSchema,
    grade: filterCodeSchema(['ALL', ...USER_GRADES] as const),
    searchType: filterCodeSchema(['email', 'name']),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
  ...listPageFields,
});
