import { ShoppingMalls } from '@/types/common.type';
import { NaverSettingAttributes, KakaoSettingAttributes } from '../types/shoppingSetting.types';
import {
  NAVER_SETTING_FIELD_TYPES,
  KAKAO_SETTING_FIELD_TYPES,
  MALL_SETTING_VALUE_MAX_LENGTH,
} from '../constant/mallSettingKeys.constant';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAcceptable = (value: unknown, expectedType: 'string' | 'boolean'): boolean => {
  if (expectedType === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string' && value !== '' && value.length <= MALL_SETTING_VALUE_MAX_LENGTH;
};

/**
 * 몰에 맞는 키만 남긴 몰 고유 설정을 돌려준다. 남는 것이 없으면 null.
 *
 * 폼은 buildMallSettingsPayload로 이미 추려 보내지만, 폼을 거치지 않는 요청은 임의 객체를
 * 그대로 jsonb에 넣을 수 있다. 몰이 바뀐 뒤에도 이전 몰의 필드가 잔병처럼 남으면
 * 순서 4의 전송 payload에 섞인다.
 *
 * 허용 키와 각 키의 기대 타입은 mallSettingKeys.constant.ts의 필드 타입 맵이 정본이다 —
 * 여기서 별도로 boolean 키 목록을 유지하지 않는다.
 */
export const sanitizeMallSettings = (
  mallCode: ShoppingMalls,
  values: unknown,
): NaverSettingAttributes | KakaoSettingAttributes | null => {
  if (mallCode !== 'NSST' && mallCode !== 'KAKAOS') return null;
  if (!isPlainObject(values)) return null;

  const fieldTypes: Record<string, 'string' | 'boolean'> =
    mallCode === 'NSST' ? NAVER_SETTING_FIELD_TYPES : KAKAO_SETTING_FIELD_TYPES;

  const picked: Record<string, string | boolean> = {};
  Object.keys(fieldTypes).forEach((key) => {
    const value = values[key];
    if (isAcceptable(value, fieldTypes[key])) picked[key] = value as string | boolean;
  });

  return Object.keys(picked).length > 0 ? (picked as NaverSettingAttributes | KakaoSettingAttributes) : null;
};
