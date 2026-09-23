import { MallLinkedProductHistory } from '../types/mallLinkedProduct.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getMallLinkedProductHistories = async (id: string): Promise<MallLinkedProductHistory[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}/histories`);

  throwIfUnauthorized(response);
  if (!response.ok) {
    throw new Error('전송 이력 조회 실패');
  }

  return response.json();
};
