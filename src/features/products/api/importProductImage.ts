import { throwIfUnauthorized } from '@/shared/utils/unauthorized';
import { INVALID_IMAGE_URL_MESSAGE } from '@/shared/constant/upload.constant';
import { ExcelImageImportFn } from '@/types/excel.type';

/** 400만 사유로 돌려주고 그 외 실패는 예외로 올린다 — `checkProductImage`와 같은 구분이다. */
export const importProductImage: ExcelImageImportFn = async (url) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/image/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  throwIfUnauthorized(response);
  if (response.ok) {
    const { key } = (await response.json()) as { key: string };
    return { ok: true, key };
  }

  if (response.status === 400) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    return { ok: false, reason: error || INVALID_IMAGE_URL_MESSAGE };
  }

  throw new Error('이미지 가져오기 요청 실패');
};
