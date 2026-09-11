/**
 * 저장된 mainImage 값을 화면 표시용 주소로 바꾼다.
 *
 * mainImage는 R2 key(`images/<ownerId>/<uuid>.png`)와 외부 절대 URL(엑셀·시드)의 합집합이다.
 * 절대 URL 분기는 전환기 코드다 — 엑셀 외부 이미지를 R2로 내려받는 작업이 끝나 값이 key로만
 * 수렴하면 이 분기를 지우고 접두사 조립만 남긴다(스펙 §3).
 *
 * process.env.NEXT_PUBLIC_R2_PUBLIC_URL을 구조분해하지 말 것. Next가 클라이언트 번들에서
 * 이 표현식을 통째로 치환하므로 구조분해하면 값이 사라진다.
 */
export const toProductImageUrl = (mainImage: string): string => {
  if (!mainImage) return '';
  if (/^https?:\/\//.test(mainImage)) return mainImage;

  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return base ? `${base}/${mainImage}` : '';
};
