import { MallAddress } from '../types/shoppingSetting.types';

/** MallAddress의 다섯 키. 쓰기 검증(shoppingSettingWriteSchema)과 저장 값 추리기가 같은 목록을 쓴다. */
export const MALL_ADDRESS_KEYS = ['code', 'name', 'zipCode', 'address', 'addressDetail'] as const;

/**
 * 알려진 다섯 키만 남긴 MallAddress를 돌려준다.
 *
 * 호출 시점에는 findShoppingSettingWriteViolation이 이미 모양을 검증했으므로 여기서는
 * 다시 검증하지 않고 추리기만 한다. 검증은 다섯 키의 존재만 보고 그 외 키는 보지 않으므로,
 * 여기서 추리지 않으면 손으로 만든 요청이 임의의 추가 키를 jsonb에 그대로 저장하고,
 * 그 값이 연동상품 스냅샷과 외부몰 전송 payload까지 그대로 흘러간다.
 */
export const pickMallAddress = (value: unknown): MallAddress => {
  const address = value as Record<string, unknown>;
  return MALL_ADDRESS_KEYS.reduce((picked, key) => {
    picked[key] = address[key] as string;
    return picked;
  }, {} as MallAddress);
};
