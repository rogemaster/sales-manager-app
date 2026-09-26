import { isMainImageOwnedBy } from '@/lib/storage';
import { IMAGE_NOT_OWNED_MESSAGE } from '@/shared/constant/upload.constant';
import { CreateProductRequest } from '@/features/products/types/product.types';
import { findProductWriteViolation, pickProductWriteFields } from '@/features/products/util/productWriteSchema';
import {
  CUSTOMER_CODE_TYPE_MESSAGE,
  findCustomerCodeInputProblem,
  normalizeCustomerCode,
} from '@/features/products/util/customerCode';

/** 검사를 통과한 저장 값. customerCode는 정규화되어 비었으면 null이다. */
export type ProductWriteValues = Omit<CreateProductRequest, 'customerCode'> & { customerCode?: string | null };

type Prepared<T> = { ok: true; values: T } | { ok: false; error: string };

/**
 * 상품 쓰기 route(등록·수정·대량등록)가 저장 전에 거치는 검사. 순서에 의미가 있다.
 *
 * 1. customerCode 모양 — 정규화는 글자가 아닌 값을 "코드 없음"으로 바꾼다. 그 전에 거부하지 않으면
 *    엑셀 TRUE 셀은 코드 없이 저장되고 PATCH의 `customerCode: true`는 기존 코드를 지운다.
 * 2. 정규화 — 길이 검사와 중복 비교가 저장될 값 기준으로 돌아야 한다.
 * 3. mainImage 소유 — key가 본인 네임스페이스가 아니면 다른 테넌트의 R2 객체를 자기 상품에 걸 수 있다.
 * 4. 필드 규칙 — 컬럼이 text·integer라 DB가 값을 걸러주지 않는다. 폼을 거치지 않는 요청을 여기서 막는다.
 *
 * DB 중복 확인은 route마다 방식이 달라(단건 / 자기 자신 제외 / 배치) 여기서 하지 않는다.
 * 'partial'은 PATCH용이다 — 보내지 않은 필드는 검사·정규화하지 않는다(customerCode '' → null은 코드 삭제).
 */
export function prepareProductWrite(input: Record<string, unknown>, ownerId: string): Prepared<ProductWriteValues>;
export function prepareProductWrite(
  input: Record<string, unknown>,
  ownerId: string,
  mode: 'partial',
): Prepared<Partial<ProductWriteValues>>;
export function prepareProductWrite(
  input: Record<string, unknown>,
  ownerId: string,
  mode: 'full' | 'partial' = 'full',
): Prepared<ProductWriteValues | Partial<ProductWriteValues>> {
  const fields = pickProductWriteFields(input);

  if (findCustomerCodeInputProblem(fields.customerCode) === 'TYPE') {
    return { ok: false, error: CUSTOMER_CODE_TYPE_MESSAGE };
  }

  const values =
    mode === 'full' || 'customerCode' in fields
      ? { ...fields, customerCode: normalizeCustomerCode(fields.customerCode) }
      : fields;

  // 글자가 아닌 mainImage는 아래 필드 규칙이 형식 오류로 잡는다.
  if (typeof values.mainImage === 'string' && values.mainImage && !isMainImageOwnedBy(values.mainImage, ownerId)) {
    return { ok: false, error: IMAGE_NOT_OWNED_MESSAGE };
  }

  const violation = findProductWriteViolation(values, mode);
  if (violation) return { ok: false, error: violation };

  // 필드 규칙을 통과했으므로 ProductWriteValues 모양이다.
  return { ok: true, values: values as unknown as ProductWriteValues };
}
