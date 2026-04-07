import { DELIVERY_TYPE_OPTION } from '@/constant/delivery.constant';

// 배송정책에 따른 배송비
export const generatorDeliveryType = (type: string, price: number) => {
  const delivery = DELIVERY_TYPE_OPTION.find((item) => item.id === type);

  if (type === 'FREE') {
    return `${delivery?.name}`;
  }
  return `${delivery?.name} ${price}원`;
};
