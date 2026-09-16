// db를 import하지 않는다 — 이 파일을 테스트할 때 DATABASE_URL이 필요 없게 하기 위해서다.
// schema.ts가 이 상수로 인덱스를 만들므로 이름이 어긋날 수 없다.
export const CUSTOMER_CODE_UNIQUE_INDEX = 'products_owner_customer_code_unique';

const MAX_CAUSE_DEPTH = 5;

/**
 * 앱 검사를 통과한 뒤 동시 저장으로 인덱스에 걸린 경우를 가려낸다. 이때는 500이 아니라 400으로 응답한다.
 * drizzle은 드라이버 오류를 `cause`로 감싸 던지므로 사슬을 따라간다.
 */
export const isCustomerCodeUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== 'object' || current === null) return false;
    const { code, constraint, cause } = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (code === '23505' && constraint === CUSTOMER_CODE_UNIQUE_INDEX) return true;
    current = cause;
  }
  return false;
};
