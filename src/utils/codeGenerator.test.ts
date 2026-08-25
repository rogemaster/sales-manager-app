import { describe, it, expect } from 'vitest';
import { generatorSkuCode } from './codeGenerator';

describe('generatorSkuCode', () => {
  it('접두사에 uuid 8자리를 붙여 만든다', () => {
    expect(generatorSkuCode('SKU')).toMatch(/^SKU-[0-9a-f]{8}$/);
  });

  it('접두사가 같아도 호출마다 다른 값이 나온다', () => {
    const skuCodes = Array.from({ length: 1000 }, () => generatorSkuCode('SKU'));

    expect(new Set(skuCodes).size).toBe(1000);
  });
});
