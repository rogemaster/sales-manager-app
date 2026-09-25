import { throwIfUnauthorized } from '@/shared/utils/unauthorized';
import { INVALID_IMAGE_URL_MESSAGE } from '@/shared/constant/upload.constant';
import { ExcelImageCheckFn } from '@/types/excel.type';

/**
 * 400만 "이미지 자체의 문제"로 보고 사유를 돌려준다.
 * 401·500·네트워크 오류는 확인에 실패한 것이지 이미지가 나쁜 것이 아니므로 예외로 올린다 —
 * 호출부가 두 경우를 다른 문구로 보여준다.
 */
export const checkProductImage: ExcelImageCheckFn = async (url) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/image/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  throwIfUnauthorized(response);
  if (response.ok) return { ok: true };

  if (response.status === 400) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    return { ok: false, reason: error || INVALID_IMAGE_URL_MESSAGE };
  }

  throw new Error('이미지 확인 요청 실패');
};
