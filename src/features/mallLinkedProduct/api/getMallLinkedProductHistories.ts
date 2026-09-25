import { MallLinkedProductHistory } from '../types/mallLinkedProduct.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getMallLinkedProductHistories = async (id: string): Promise<MallLinkedProductHistory[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}/histories`);

  await throwIfNotOk(response, '전송 이력 조회 실패');

  return response.json();
};
