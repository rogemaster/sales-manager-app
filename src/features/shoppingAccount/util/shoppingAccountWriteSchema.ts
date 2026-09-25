import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { EMAIL_REGEX } from '@/shared/utils/email';
import { PHONE_REGEX } from '@/shared/utils/phone';
import { CreateShoppingAccountBody } from '../types/shoppingAccount.types';

type WriteValues = Partial<CreateShoppingAccountBody>;

// 컬럼이 text·boolean이라 DB가 값을 걸러주지 않는다. 폼을 거치지 않는 요청을 여기서 막는다.
const REQUIRED_TEXT: { key: keyof WriteValues; message: string }[] = [
  { key: 'mallId', message: '쇼핑몰 ID를 입력해주세요.' },
  { key: 'managerMd', message: '담당MD를 입력해주세요.' },
  { key: 'category', message: '카테고리를 선택해주세요.' },
  { key: 'password', message: '패스워드를 입력해주세요.' },
  { key: 'apiKey', message: 'API Key를 입력해주세요.' },
];

// 선택값이라 빈 문자열·undefined는 허용하지만, null은 컬럼이 NOT NULL이라 DB 에러(500)로 이어진다.
// undefined는 drizzle이 .values()/.set()에서 빼주므로 여기서 거를 필요가 없다 — 키가 있는데 문자열이 아닌 경우만 막는다.
const OPTIONAL_TEXT: { key: keyof WriteValues; message: string }[] = [
  { key: 'nickname', message: '별명 값이 올바르지 않습니다.' },
  { key: 'domain', message: '도메인 값이 올바르지 않습니다.' },
  { key: 'phone', message: '연락처 값이 올바르지 않습니다.' },
  { key: 'email', message: '이메일 값이 올바르지 않습니다.' },
];

/**
 * 쓰기 값의 위반 사유를 하나 돌려준다. 위반이 없으면 null.
 *
 * mode가 'partial'이면 요청에 담긴 필드만 본다 — PATCH는 바꾸려는 필드만 보낸다.
 * 주의: PATCH route는 빈 password·apiKey를 걷어낸 뒤의 값을 넘겨야 한다.
 * patch를 그대로 넘기면 "변경 안 함"을 뜻하는 빈 칸이 위반으로 잡혀 400이 된다.
 */
export const findShoppingAccountWriteViolation = (
  values: WriteValues,
  mode: 'create' | 'partial' = 'create',
): string | null => {
  const has = (key: keyof WriteValues) => mode === 'create' || key in values;

  if (has('mallCode') && !SHOPPING_MALL_CODES.includes(String(values.mallCode ?? ''))) {
    return '유효하지 않은 쇼핑몰입니다.';
  }

  for (const { key, message } of REQUIRED_TEXT) {
    if (!has(key)) continue;
    const value = values[key];
    if (typeof value !== 'string' || value.trim() === '') return message;
  }

  if (has('isActive') && typeof values.isActive !== 'boolean') {
    return '사용여부 값이 올바르지 않습니다.';
  }

  // 키가 있는데 문자열이 아니면(null 등) 거부한다. 키 자체가 없으면(undefined) 지나간다.
  for (const { key, message } of OPTIONAL_TEXT) {
    if (!has(key)) continue;
    const value = values[key];
    if (value !== undefined && typeof value !== 'string') return message;
  }

  // 연락처·이메일은 선택값이다 — 값이 있을 때만 형식을 본다.
  if (values.phone && !PHONE_REGEX.test(values.phone)) {
    return '올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)';
  }

  if (values.email && !EMAIL_REGEX.test(values.email)) {
    return '올바른 이메일 형식을 입력해주세요.';
  }

  return null;
};
