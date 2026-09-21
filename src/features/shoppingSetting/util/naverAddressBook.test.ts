import { describe, it, expect } from 'vitest';
import { toMallAddresses } from './naverAddressBook';

describe('toMallAddresses', () => {
  it('시뮬레이터 응답의 addressId를 우리 code로 옮긴다', () => {
    const response = {
      addresses: [
        {
          addressId: 'naver_seller_1_shipping',
          addressType: 'SHIPPING',
          name: '기본 출고지',
          zipCode: '08589',
          address: '서울특별시 금천구 가산디지털1로 168',
          addressDetail: '3층 301호',
        },
      ],
    };

    expect(toMallAddresses(response)).toEqual([
      {
        code: 'naver_seller_1_shipping',
        name: '기본 출고지',
        zipCode: '08589',
        address: '서울특별시 금천구 가산디지털1로 168',
        addressDetail: '3층 301호',
      },
    ]);
  });

  it('addresses가 비면 빈 배열이다', () => {
    expect(toMallAddresses({ addresses: [] })).toEqual([]);
  });

  it('모양이 다른 응답은 빈 배열로 돌려준다', () => {
    expect(toMallAddresses(null)).toEqual([]);
    expect(toMallAddresses({})).toEqual([]);
    expect(toMallAddresses({ addresses: '목록 아님' })).toEqual([]);
  });

  it('항목에 addressId가 없으면 그 항목만 뺀다', () => {
    const response = {
      addresses: [
        { name: '깨진 항목', zipCode: '08589', address: '주소', addressDetail: '' },
        {
          addressId: 'naver_seller_1_return',
          addressType: 'RETURN',
          name: '기본 반품지',
          zipCode: '14548',
          address: '경기도 부천시 원미구 길주로 210',
          addressDetail: '2층 202호',
        },
      ],
    };

    expect(toMallAddresses(response)).toHaveLength(1);
    expect(toMallAddresses(response)[0].code).toBe('naver_seller_1_return');
  });
});
