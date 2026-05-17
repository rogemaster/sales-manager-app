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

// 주문
export const generatorOrderCode = () => {
  const uuid = uuidv4().split('-');
  return `order_${uuid[0]}${uuid[1]}`;
};
