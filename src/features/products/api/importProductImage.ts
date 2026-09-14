/** 400만 사유로 돌려주고 그 외 실패는 예외로 올린다 — `checkProductImage`와 같은 구분이다. */
export const importProductImage = async (
  url: string,
): Promise<{ ok: true; key: string } | { ok: false; reason: string }> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/image/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (response.ok) {
    const { key } = (await response.json()) as { key: string };
    return { ok: true, key };
  }

  if (response.status === 400) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    return { ok: false, reason: error || '올바른 이미지 주소가 아닙니다.' };
  }

  throw new Error('이미지 가져오기 요청 실패');
};
