/** 남의 설정이든 없는 설정이든 같은 문구를 쓴다. 구분해 답하면 남의 id를 탐색하는 도구가 된다. */
export const SETTING_NOT_FOUND_MESSAGE = '존재하지 않는 설정입니다.';

const NICKNAME_MAX_LENGTH = 100;
const ADDRESS_FIELD_MAX_LENGTH = 200;

const PRODUCT_CONDITIONS = ['NEW', 'USED'];
const SALES_PERIODS = [7, 15, 30, 60, 90];
const ADDRESS_KEYS = ['code', 'name', 'zipCode', 'address', 'addressDetail'];

/** route가 받는 값은 폼을 거치지 않을 수 있어 타입을 믿을 수 없다. unknown으로 받아 여기서 좁힌다. */
export type SettingWriteValues = Record<string, unknown>;

const isFilledString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** 주소가 MallAddress 모양이고 각 칸이 상한 안인지 본다. code가 비면 순서 4 전송에서 외부몰이 거부한다. */
const isValidAddress = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const address = value as Record<string, unknown>;
  return ADDRESS_KEYS.every((key) => {
    const field = address[key];
    if (typeof field !== 'string') return false;
    if (field.length > ADDRESS_FIELD_MAX_LENGTH) return false;
    // addressDetail은 빈 값을 허용한다 — 상세주소가 없는 주소가 있다.
    return key === 'addressDetail' ? true : field.trim() !== '';
  });
};

/**
 * 쓰기 값의 위반 사유를 하나 돌려준다. 위반이 없으면 null.
 *
 * mode가 'partial'이면 요청에 담긴 키만 본다 — PATCH는 바꾸려는 필드만 보낸다.
 * 키가 있으면서 값이 null인 경우는 "지우겠다"는 뜻이므로 필수 필드에서는 위반이다
 * (선택 필드의 값 없음이 undefined가 아니라 null로 도착하는 전례: PR#70).
 *
 * mallId·mallCode는 여기서 보지 않는다 — route가 계정에서 읽어 채우므로 클라이언트 값은 버려진다.
 *
 * 호출자는 반드시 이 함수가 검사에 쓴 것과 같은 강제변환값을 저장해야 한다 — 원본 body 필드를
 * 그대로 저장하면 안 된다. salesPeriod는 `Number('30')`이 유효하다는 것으로 `'30'`을 통과시키므로,
 * 문자열 그대로 저장하면 검증을 통과한 값과 실제로 저장되는 값이 달라진다.
 */
export const findShoppingSettingWriteViolation = (
  values: SettingWriteValues,
  mode: 'create' | 'partial' = 'create',
): string | null => {
  const has = (key: string) => mode === 'create' || key in values;

  if (has('mallAccountId') && !isFilledString(values.mallAccountId)) {
    return '쇼핑몰 계정을 선택해주세요.';
  }

  if (has('nickname')) {
    if (!isFilledString(values.nickname)) return '별칭을 입력해주세요.';
    if (values.nickname.length > NICKNAME_MAX_LENGTH) return '별칭이 너무 깁니다.';
  }

  if (has('isActive') && typeof values.isActive !== 'boolean') {
    return '사용여부 값이 올바르지 않습니다.';
  }

  if (has('productCondition') && !PRODUCT_CONDITIONS.includes(String(values.productCondition))) {
    return '상품상태 값이 올바르지 않습니다.';
  }

  if (has('salesPeriod') && !SALES_PERIODS.includes(Number(values.salesPeriod))) {
    return '판매기간 값이 올바르지 않습니다.';
  }

  if (has('shippingAddress')) {
    if (values.shippingAddress === null || values.shippingAddress === undefined) {
      return '출고지를 선택해주세요.';
    }
    if (!isValidAddress(values.shippingAddress)) return '출고지 값이 올바르지 않습니다.';
  }

  if (has('returnAddress')) {
    if (values.returnAddress === null || values.returnAddress === undefined) {
      return '반품지를 선택해주세요.';
    }
    if (!isValidAddress(values.returnAddress)) return '반품지 값이 올바르지 않습니다.';
  }

  return null;
};
