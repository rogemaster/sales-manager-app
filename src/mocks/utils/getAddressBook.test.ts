import { describe, it, expect } from 'vitest';
import { getMockAddressBook } from './getAddressBook';

describe('getMockAddressBook', () => {
  it('COUP 몰코드로 조회하면 COUP 접두어 코드의 주소만 반환한다', () => {
    const result = getMockAddressBook('COUP');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((address) => expect(address.code.startsWith('COUP-')).toBe(true));
  });

  it('모든 항목에 zipCode/address/addressDetail/name/code가 존재한다', () => {
    const result = getMockAddressBook('NSST');
    result.forEach((address) => {
      expect(address.code).toBeTruthy();
      expect(address.name).toBeTruthy();
      expect(address.zipCode).toBeTruthy();
      expect(address.address).toBeTruthy();
      expect(address.addressDetail).toBeTruthy();
    });
  });
});
