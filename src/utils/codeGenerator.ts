import { v4 as uuidv4 } from 'uuid';

// 프로그램 자체 코드 생성
export const generatorProductCode = () => {
  return `prodc_${uuidv4().split('-')[0]}`;
};

export const generatorOrderCode = () => {
  const uuid = uuidv4().split('-');
  return `order_${uuid[0]}${uuid[1]}`;
};
