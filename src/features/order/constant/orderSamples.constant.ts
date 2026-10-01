/**
 * 네이버 외 몰 무작위 주문의 주문자·배송지 예시. 실존 인물·주소와 무관한 샘플이다.
 * 시뮬레이터(src/simulators/naver/orderSamples.ts)에 비슷한 목록이 있지만 import하지 않는다 — 앱과 시뮬레이터 사이 경계.
 */
export const ORDER_SAMPLE_NAMES = ['한지민', '오세훈', '서지아', '문현우', '배수빈', '신도현', '권나연', '황민재'];

export const ORDER_SAMPLE_ADDRESSES = [
  { zipCode: '03187', baseAddress: '서울특별시 종로구 종로 1', detailAddress: '8층' },
  { zipCode: '13529', baseAddress: '경기도 성남시 분당구 판교역로 166', detailAddress: '2층' },
  { zipCode: '41940', baseAddress: '대구광역시 중구 공평로 88', detailAddress: '301호' },
  { zipCode: '21999', baseAddress: '인천광역시 연수구 센트럴로 123', detailAddress: '1203호' },
];

/** null이 섞여 있다 — 배송메시지가 없는 주문도 만든다. */
export const ORDER_SAMPLE_MEMOS: (string | null)[] = [null, null, '부재 시 문 앞', '배송 전 연락 주세요.'];
