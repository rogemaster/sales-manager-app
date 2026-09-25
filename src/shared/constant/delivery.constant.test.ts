import { describe, it, expect } from 'vitest';
import { isPaidDelivery } from './delivery.constant';

describe('isPaidDelivery', () => {
  it.each(['NOT_FREE', 'CONDITIONAL_FREE'])('%s는 배송비를 받는다', (type) => {
    expect(isPaidDelivery(type)).toBe(true);
  });

  it.each(['FREE', 'CHARGE_RECEIVED', '', undefined])('%s는 배송비 입력이 없다', (type) => {
    expect(isPaidDelivery(type)).toBe(false);
  });
});
