import { MALL_AUTH_FAILED_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

export const MALL_NO_RESPONSE_MESSAGE = '외부 쇼핑몰 응답 없음';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 네이버(외부몰)가 쓰는 필드 경로를 우리 화면이 쓰는 이름으로 바꾼다.
const FIELD_LABELS: Record<string, string> = {
  name: '상품명',
  statusType: '판매상태',
  leafCategoryId: '카테고리',
  detailContent: '상세설명',
  images: '대표이미지',
  'images.representativeImage': '대표이미지',
  'images.representativeImage.url': '대표이미지',
  salePrice: '판매가',
  stockQuantity: '재고수량',
  deliveryInfo: '배송정보',
  'deliveryInfo.deliveryFeeType': '배송비 유형',
  'deliveryInfo.baseFee': '배송비',
  'deliveryInfo.deliveryCompany': '택배사',
  'deliveryInfo.shippingAddressId': '출고지',
  'deliveryInfo.returnAddressId': '반품지',
  brandName: '브랜드',
  manufacturerName: '제조사',
  productInfoProvidedNotice: '상품정보제공고시',
  sellerManagementCode: '고객사 상품코드',
  modelName: '모델명',
  modelId: '모델ID',
  taxType: '과세유형',
  originAreaCode: '원산지',
  minorPurchasable: '미성년자 구매',
  sellerTags: '검색 키워드',
  optionCombinations: '옵션',
};

const labelFor = (name: string): string => FIELD_LABELS[name] ?? name;

/** 한글 음절(U+AC00~U+D7A3)의 종성(받침) 유무. 받침 있으면 true, 한글이 아니거나 받침이 없으면 false. */
const hasFinalConsonant = (char: string): boolean => {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
};

const withSubjectParticle = (label: string): string => {
  const lastChar = label.at(-1) ?? '';
  return hasFinalConsonant(lastChar) ? `${label}이` : `${label}가`;
};

const describeInput = (input: Record<string, unknown>): string => {
  const label = labelFor(String(input.name));
  if (input.type === 'REQUIRED') return `${withSubjectParticle(label)} 없습니다.`;
  return `${label}: ${String(input.message)}`;
};

/**
 * 네이버 에러 응답을 errorMessage 한 문자열로 접는다.
 *
 * invalidInputs[].type을 요청 단위 사유로 읽지 않는다 — 주소록 실패는 HTTP 400인데 type이 NOT_FOUND라
 * 층이 다르다. 사람이 읽을 message만 쓴다. 필드 오류는 전부 담고 화면에서 말줄임한다.
 * 필드별 문장만 이어 붙이고 요청 단위 접두사(body.message)는 싣지 않는다 — 사용자가 읽을 것은
 * "무엇이 왜 안 됐는지"이지, 서버 응답의 정형 문구가 아니다.
 */
export const foldNaverError = (status: number, body: unknown): string => {
  if (status === 401) return MALL_AUTH_FAILED_MESSAGE;
  if (status >= 500 || !isRecord(body) || typeof body.message !== 'string') return MALL_NO_RESPONSE_MESSAGE;

  const inputs = Array.isArray(body.invalidInputs) ? body.invalidInputs.filter(isRecord) : [];
  if (inputs.length === 0) return body.message;

  const details = inputs.map((input) => (input.name ? describeInput(input) : String(input.message)));
  return details.join(' / ');
};
