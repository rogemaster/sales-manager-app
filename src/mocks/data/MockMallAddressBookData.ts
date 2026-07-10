import { ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { MallAddress } from '@/features/shoppingSetting/types/shoppingSetting.types';

const BASE_ADDRESSES: Omit<MallAddress, 'code'>[] = [
  {
    name: '본사 물류센터',
    zipCode: '08589',
    address: '서울특별시 금천구 가산디지털1로 168',
    addressDetail: '3층 301호',
  },
  {
    name: '경기 물류센터',
    zipCode: '14548',
    address: '경기도 부천시 원미구 길주로 210',
    addressDetail: '2층 202호',
  },
];

export const MOCK_MALL_ADDRESS_BOOK: Record<ShoppingMalls, MallAddress[]> = SHOPPING_MALLS.reduce(
  (acc, mall) => {
    const mallCode = mall.code as ShoppingMalls;
    acc[mallCode] = BASE_ADDRESSES.map((base, index) => ({
      ...base,
      code: `${mallCode}-WH-${String(index + 1).padStart(2, '0')}`,
    }));
    return acc;
  },
  {} as Record<ShoppingMalls, MallAddress[]>,
);
