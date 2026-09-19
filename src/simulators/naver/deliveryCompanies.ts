/**
 * 네이버가 인정하는 택배사 목록. 우리 DELIVERY_COMPANY(@/shared/constant/delivery.constant)와
 * 값은 같지만 import하지 않고 복제한다 — 외부몰의 목록이 우리 상수를 따라 바뀌면 안 된다.
 */
export const NAVER_DELIVERY_COMPANIES = [
  { code: 'CJ', name: '대한통운' },
  { code: 'HANJIN', name: '한진택배' },
  { code: 'LOTTE', name: '롯데택배' },
  { code: 'EPOST', name: '우체국택배' },
  { code: 'LOGEN', name: '로젠택배' },
];

export const isKnownDeliveryCompany = (code: string): boolean =>
  NAVER_DELIVERY_COMPANIES.some((company) => company.code === code);
