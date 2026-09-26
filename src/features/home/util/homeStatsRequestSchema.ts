import { z } from 'zod';
import { isYmd } from '@/shared/utils/date';

const INVALID_PERIOD_MESSAGE = '조회 기간이 올바르지 않습니다.';

// 보정하지 않고 거절한다 — 다른 기간으로 바꾸면 사용자가 고른 기간과 다른 집계를 정상 응답으로 돌려준다.
const date = z
  .string({ required_error: INVALID_PERIOD_MESSAGE, invalid_type_error: INVALID_PERIOD_MESSAGE })
  .refine(isYmd, INVALID_PERIOD_MESSAGE);

/** POST /api/home/stats, /api/home/linked-product-stats 요청. 홈 업무현황 기간 버튼이 두 요청에 같은 기간을 보낸다. */
export const homeStatsRequestSchema = z.object({ startDate: date, endDate: date });
