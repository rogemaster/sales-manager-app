import { v4 as uuidv4 } from 'uuid';

// 프로그램 자체 코드 생성
// 상품
export const generatorProductCode = () => {
  return `prod_${uuidv4().split('-')[0]}`;
};

// 옵션
export const generatorOptionId = () => {
  return `opt_${uuidv4().split('-')[0]}`;
};

// 옵션 SKU
// 접두사를 인자로 받는 이유: 화면 일괄생성은 'SKU', 엑셀은 사용자가 시트에 적은 값을 쓴다.
// 순번(index + 1)은 모든 상품이 001부터 시작해 상품 간 값이 겹친다.
export const generatorSkuCode = (prefix: string) => {
  return `${prefix}-${uuidv4().split('-')[0]}`;
};

// 주문
export const generatorOrderCode = () => {
  const uuid = uuidv4().split('-');
  return `order_${uuid[0]}${uuid[1]}`;
};

// 쇼핑몰계정 — 서버가 채번한다(클라이언트 채번을 신뢰하지 않는다)
export const generatorShoppingAccountCode = () => {
  return `sa_${uuidv4().split('-')[0]}`;
};
