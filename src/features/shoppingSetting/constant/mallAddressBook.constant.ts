import { ShoppingMalls } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { MallAddress } from '../types/shoppingSetting.types';

/**
 * 시뮬레이터가 없는 몰의 주소록. 서버 route가 읽는다.
 *
 * 원래 외부몰이 소유하는 데이터라 우리 DB에 정본을 두지 않는다 — 몰마다 시뮬레이터가 생기면
 * 하나씩 지워질 임시 데이터다. 네이버는 이미 지워졌다(실조회로 대체).
 * addressType과 무관하게 같은 목록을 준다.
 */
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

export const STATIC_MALL_ADDRESS_BOOK: Record<ShoppingMalls, MallAddress[]> = SHOPPING_MALLS.reduce(
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
