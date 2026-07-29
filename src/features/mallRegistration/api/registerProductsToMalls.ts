import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export interface RegisterProductsToMallsResponse {
  success: boolean;
  count: number;
}

export const registerProductsToMalls = async (
  ownerId: string,
  items: MallRegistrationRequestItem[],
): Promise<RegisterProductsToMallsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/mall-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, items }),
  });
  if (!response.ok) throw new Error('쇼핑몰 등록 전송 실패');
  return response.json();
};
