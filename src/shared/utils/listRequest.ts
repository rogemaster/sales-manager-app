import { z } from 'zod';
import { isYmd } from '@/shared/utils/date';
import { clampPositiveInt } from '@/shared/utils/pagination';

/** 목록 route의 pageSize 상한. 넘으면 테넌트 전체를 한 번에 긁을 수 있다. */
export const LIST_PAGE_SIZE_MAX = 100;
export const DEFAULT_LIST_PAGE_SIZE = 10;

export const INVALID_SEARCH_DATE_MESSAGE = '검색 기간이 올바르지 않습니다.';

/**
 * 목록 검색 기간. 보정하지 않고 거절한다 — 임의의 기간으로 바꾸면 사용자가 요청한 것과 다른 결과를
 * 정상 응답으로 돌려주게 되어 빈 목록의 원인을 추적할 수 없다.
 */
export const searchDateSchema = z
  .string({ required_error: INVALID_SEARCH_DATE_MESSAGE, invalid_type_error: INVALID_SEARCH_DATE_MESSAGE })
  .refine(isYmd, INVALID_SEARCH_DATE_MESSAGE);

export const INVALID_FILTER_MESSAGE = '검색 조건이 올바르지 않습니다.';

const filterError = { errorMap: () => ({ message: INVALID_FILTER_MESSAGE }) };

/** 목록 필터 Select의 코드값. 목록 밖이면 거절한다 — 조용히 무시하면 필터가 걸리지 않은 결과를 돌려준다. */
// 제네릭이라 as const 배열을 넘기면 결과 타입이 리터럴 유니온으로 남는다.
export const filterCodeSchema = <T extends string>(codes: readonly T[]) => z.enum(codes as [T, ...T[]], filterError);

/** 목록 검색어·id 같은 자유 입력 필터. */
export const filterTextSchema = (max: number) => z.string(filterError).max(max, INVALID_FILTER_MESSAGE);

const pageValue = (fallback: number, max: number) => z.unknown().transform((v) => clampPositiveInt(v, fallback, max));

/**
 * 목록 요청의 page·pageSize. 날짜·필터 코드와 달리 거절하지 않고 보정한다.
 * 화면이 코드로 만드는 값이라 틀리면 클라이언트 버그인데, 그때 목록 전체를 실패로 보이는 것보다
 * 첫 페이지를 보여주는 편이 낫고 결과의 의미도 바뀌지 않는다(2026-09-26 결정).
 */
export const listPageFields = {
  page: pageValue(1, Number.MAX_SAFE_INTEGER),
  pageSize: pageValue(DEFAULT_LIST_PAGE_SIZE, LIST_PAGE_SIZE_MAX),
};
