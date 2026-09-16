import { CustomerCodeDuplicate } from '../util/customerCode';

/**
 * 200만 결과로 본다. 400·401·500·네트워크 오류는 "확인하지 못한 것"이지 중복이 아니므로 예외로 올린다 —
 * 호출부가 확인 실패를 중복과 다른 문구로 보여준다(checkProductImage와 같은 구분).
 */
export const checkCustomerCodes = async (
  codes: string[],
  excludeProductId?: string,
): Promise<CustomerCodeDuplicate[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/customer-code/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codes, excludeProductId }),
  });

  if (!response.ok) throw new Error('고객사 상품코드 확인 요청 실패');

  const { duplicates } = (await response.json()) as { duplicates: CustomerCodeDuplicate[] };
  return duplicates;
};
