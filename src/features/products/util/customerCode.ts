import { PRODUCT_BULK_MAX_ROWS } from '@/features/products/constant/bulk.constant';

/**
 * 고객사 상품코드는 워크스페이스 안에서 겹치면 안 된다(사용자가 명시한 예외 — skuCode의 "중복은 사용자 책임"과 반대).
 * 저장은 앞뒤 공백만 지운 원래 표기로, 비교는 소문자 키로 한다. DB 인덱스
 * `lower(btrim(customer_code)) WHERE btrim(customer_code) <> ''`와 같은 기준이어야 한다.
 */

export type CustomerCodeDuplicate = { code: string; existingCode: string };
export type ExistingCustomerCode = { key: string; existingCode: string };

export const CUSTOMER_CODE_MAX_LENGTH = 100;

export const CUSTOMER_CODE_CONFLICT_MESSAGE = '이미 등록된 고객사 상품코드입니다.';
export const CUSTOMER_CODE_CHECK_FAILED_MESSAGE = '고객사 상품코드 중복 확인에 실패했습니다. 다시 시도해 주세요.';

export const CUSTOMER_CODE_TYPE_MESSAGE = '고객사 상품코드는 글자로 입력해야 합니다.';

/**
 * 정규화 전에 입력값의 모양을 본다. 정규화는 문자열·숫자가 아닌 값을 null("코드 없음")로 바꾸므로,
 * 이 검사 없이 정규화하면 엑셀의 TRUE 셀은 코드 없이 저장되고 PATCH의 `customerCode: true`는 기존 코드를 지운다.
 */
export const findCustomerCodeInputProblem = (value: unknown): 'TYPE' | 'LENGTH' | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return 'TYPE';
  if (typeof value !== 'string' && typeof value !== 'number') return 'TYPE';
  return String(value).trim().length > CUSTOMER_CODE_MAX_LENGTH ? 'LENGTH' : null;
};

/** 저장용. 비었으면 null — ''로 저장하면 "코드 없음"이 두 모양이 된다. 엑셀 숫자 셀은 문자열로 받는다. */
export const normalizeCustomerCode = (value: unknown): string | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** 비교용. 'cs-001'과 'CS-001'은 같은 코드다. */
export const toCustomerCodeKey = (code: string): string => code.toLowerCase();

/** 정규화된 목록에서 키가 같은 index 묶음(2개 이상)을 찾는다. 엑셀 미리보기는 묶음의 모든 행을 오류로 표시한다. */
export const findDuplicateCustomerCodeGroups = (codes: readonly (string | null)[]): number[][] => {
  const byKey = new Map<string, number[]>();
  codes.forEach((code, index) => {
    if (code === null) return;
    const key = toCustomerCodeKey(code);
    byKey.set(key, [...(byKey.get(key) ?? []), index]);
  });
  return [...byKey.values()].filter((indexes) => indexes.length > 1);
};

/** 앞에서 이미 나온 키를 가진 첫 index. bulk route가 첫 위반 행 하나만 돌려줄 때 쓴다 — 첫 등장 행은 그 자체로 문제가 없다. */
export const findFirstRepeatedCustomerCodeIndex = (codes: readonly (string | null)[]): number => {
  const seen = new Set<string>();
  return codes.findIndex((code) => {
    if (code === null) return false;
    const key = toCustomerCodeKey(code);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
};

export const matchExistingCustomerCodes = (
  codes: readonly string[],
  existing: readonly ExistingCustomerCode[],
): CustomerCodeDuplicate[] => {
  const byKey = new Map(existing.map(({ key, existingCode }) => [key, existingCode]));
  return codes.flatMap((code) => {
    const existingCode = byKey.get(toCustomerCodeKey(code));
    return existingCode === undefined ? [] : [{ code, existingCode }];
  });
};

/** 확인 API 요청 본문. 형식이 틀리면 null. 돌려주는 codes는 정규화·빈 값 제거·키 기준 중복 제거를 마친 값이다. */
export const readCustomerCodeCheckRequest = (body: unknown): { codes: string[]; excludeProductId?: string } | null => {
  if (typeof body !== 'object' || body === null) return null;
  const { codes, excludeProductId } = body as { codes?: unknown; excludeProductId?: unknown };

  if (!Array.isArray(codes) || codes.length > PRODUCT_BULK_MAX_ROWS) return null;
  if (!codes.every((code) => typeof code === 'string')) return null;
  if (excludeProductId !== undefined && typeof excludeProductId !== 'string') return null;

  // 쓰기 스키마와 같은 상한. 넘는 코드는 어차피 저장되지 않으므로 조회하지 않는다.
  if (codes.some((code) => findCustomerCodeInputProblem(code) !== null)) return null;

  const seen = new Set<string>();
  const unique = codes.flatMap((raw) => {
    const code = normalizeCustomerCode(raw);
    if (code === null || seen.has(toCustomerCodeKey(code))) return [];
    seen.add(toCustomerCodeKey(code));
    return [code];
  });

  return excludeProductId === undefined ? { codes: unique } : { codes: unique, excludeProductId };
};

export const formatCustomerCodeDuplicateMessage = (code: string, existingCode: string): string =>
  code === existingCode
    ? `이미 등록된 고객사 상품코드입니다: ${code}`
    : `이미 등록된 고객사 상품코드입니다: ${code} (등록된 코드: ${existingCode})`;

export const formatCustomerCodeInRequestMessage = (code: string): string =>
  `요청 안에서 고객사 상품코드가 중복됩니다: ${code}`;
