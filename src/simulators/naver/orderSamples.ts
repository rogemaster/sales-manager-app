/** 시뮬레이터가 만드는 주문의 주문자·수취인·배송지 예시. 실존 인물·주소와 무관한 샘플이다. */
export const SAMPLE_NAMES = [
  '김민준',
  '이서연',
  '박도윤',
  '최하은',
  '정시우',
  '강지유',
  '조하준',
  '윤서아',
  '장예준',
  '임지아',
];

export const SAMPLE_ADDRESSES = [
  { zipCode: '06236', baseAddress: '서울특별시 강남구 테헤란로 152', detailAddress: '12층' },
  { zipCode: '04524', baseAddress: '서울특별시 중구 세종대로 110', detailAddress: '3층' },
  { zipCode: '48058', baseAddress: '부산광역시 해운대구 센텀중앙로 79', detailAddress: '101동 1203호' },
  { zipCode: '34126', baseAddress: '대전광역시 유성구 대학로 99', detailAddress: '2동 305호' },
  { zipCode: '61945', baseAddress: '광주광역시 서구 내방로 111', detailAddress: '5층' },
];

/** null이 섞여 있다 — 배송메시지가 없는 주문도 만든다. */
export const SAMPLE_MEMOS: (string | null)[] = [
  null,
  null,
  '부재 시 문 앞에 놓아주세요.',
  '배송 전 연락 바랍니다.',
  '경비실에 맡겨주세요.',
];
