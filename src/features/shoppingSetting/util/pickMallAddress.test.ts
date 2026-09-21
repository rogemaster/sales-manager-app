import { describe, it, expect } from 'vitest';
import { pickMallAddress } from './pickMallAddress';

describe('pickMallAddress', () => {
  it('깨끗한 주소는 그대로 통과한다', () => {
    const address = {
      code: 'COUP-WH-01',
      name: '본사 물류센터',
      zipCode: '08589',
      address: '서울특별시 금천구 가산디지털1로 168',
      addressDetail: '3층 301호',
    };
    expect(pickMallAddress(address)).toEqual(address);
  });

  it('알려지지 않은 추가 키는 버린다', () => {
    const result = pickMallAddress({
      code: 'COUP-WH-01',
      name: '본사 물류센터',
      zipCode: '08589',
      address: '서울특별시 금천구 가산디지털1로 168',
      addressDetail: '3층 301호',
      injected: '악의적인 값',
      __proto__: { polluted: true },
    });
    expect(result).toEqual({
      code: 'COUP-WH-01',
      name: '본사 물류센터',
      zipCode: '08589',
      address: '서울특별시 금천구 가산디지털1로 168',
      addressDetail: '3층 301호',
    });
    expect(Object.keys(result)).toEqual(['code', 'name', 'zipCode', 'address', 'addressDetail']);
  });

  it('필드 값을 그대로 보존한다(가공하지 않는다)', () => {
    const address = {
      code: '  padded-code  ',
      name: '',
      zipCode: '14548',
      address: '경기도 부천시 원미구 길주로 210',
      addressDetail: '',
    };
    expect(pickMallAddress(address)).toEqual(address);
  });
});
