import { z } from 'zod';
import { UserGrade } from '@/features/auth/types/Auth';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';

export const USER_LIST_PAGE_SIZE_MAX = 100;

const USER_GRADES = ['super_admin', 'admin', 'operator'] as const satisfies readonly UserGrade[];
// users.created_at·updated_at은 text 'YYYY-MM-DD'라 같은 모양의 문자열끼리 사전순 비교한다.
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.');

/** POST /api/account/users/list 요청. 폼이 없는 서버 전용 스키마다. */
export const userListRequestSchema = z.object({
  filters: z.object({
    dateType: z.enum(['createdAt', 'updatedAt']),
    startDate: DATE,
    endDate: DATE,
    // z.enum은 튜플만 받는다. ['ALL', ...USER_GRADES]는 string[]로 넓어져 타입 오류가 나므로 union으로 잇는다.
    grade: z.union([z.literal('ALL'), z.enum(USER_GRADES)]),
    searchType: z.enum(['email', 'name']),
    searchValue: z.string().max(TEXT_LIMITS.search),
  }),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(USER_LIST_PAGE_SIZE_MAX),
});
