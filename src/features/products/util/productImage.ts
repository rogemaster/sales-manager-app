/**
 * 저장된 mainImage(R2 key)를 화면 표시용 주소로 바꾼다.
 *
 * mainImage는 R2 key(`images/<ownerId>/<uuid>.<png|jpg>`)만 담는다. 엑셀의 외부 이미지 주소도
 * /api/products/image/import를 거쳐 key가 된다.
 *
 * process.env.NEXT_PUBLIC_R2_PUBLIC_URL을 구조분해하지 말 것. Next가 클라이언트 번들에서
 * 이 표현식을 통째로 치환하므로 구조분해하면 값이 사라진다.
 */
export const toProductImageUrl = (mainImage: string): string => {
  if (!mainImage) return '';

  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return base ? `${base}/${mainImage}` : '';
};
