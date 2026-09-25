import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { RangeTypeProps } from '@/types/common.type';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 'YYYY-MM-DD' 형식이면서 실재하는 날짜인지 판정한다.
 *
 * isValid()만으로는 부족하다 — dayjs는 '2026-02-31'을 3월 3일로 굴려서 받아들이고 valid로 답한다.
 * 그래서 다시 포맷해 원문과 같은지 왕복 비교한다.
 */
export const isYmd = (value: unknown): value is string =>
  typeof value === 'string' && YMD.test(value) && dayjs(value).format('YYYY-MM-DD') === value;

/**
 * 'YYYY-MM-DD' 두 개를 KST 기준 반개구간 [start, endExclusive) 으로 바꾼다.
 *
 * 끝날짜를 그대로 lte 비교에 쓰면 그 날 00:00 으로 해석되어
 * 끝날짜 당일에 등록된 건이 통째로 누락된다. 그래서 다음날 자정을 배타 경계로 쓴다.
 * 서버(Vercel)는 UTC로 돌기 때문에 경계를 반드시 KST로 만들어야
 * 자정~오전 9시 사이 등록 건이 하루 밀리지 않는다.
 */
export const toKstDateRange = (startDate: string, endDate: string): { start: Date; endExclusive: Date } => ({
  start: dayjs.tz(startDate, KST).startOf('day').toDate(),
  endExclusive: dayjs.tz(endDate, KST).startOf('day').add(1, 'day').toDate(),
});

/**
 * 시각을 KST 기준 'YYYY-MM-DD'로 자른다.
 *
 * 서버(Vercel)는 UTC로 돌기 때문에 dayjs(date).format()을 그대로 쓰면
 * KST 자정~오전 9시 사이 시각이 전날 날짜로 표시된다.
 */
export const toKstYmd = (date: Date | string): string => dayjs(date).tz(KST).format('YYYY-MM-DD');

/** 화면의 기간 버튼(최근 N일·N개월)용 [시작, 끝] Date. 브라우저 시각 기준이다 — 서버 필터 비교는 toKstDateRange가 한다. */
export const calculatorRangeDate = (value: RangeTypeProps): [Date, Date] => {
  const startDate = dayjs().subtract(value.range, value.uniq).toDate();
  return [startDate, new Date()];
};
