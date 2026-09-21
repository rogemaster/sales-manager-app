import {
  NaverSettingAttributes,
  KakaoSettingAttributes,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { NAVER_SETTING_KEYS, KAKAO_SETTING_KEYS } from '../constant/mallSettingKeys.constant';

type MallSettingsSource = Partial<NaverSettingAttributes & KakaoSettingAttributes>;

const pickDefined = <T extends MallSettingsSource, K extends keyof T>(source: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (source[key] !== undefined && source[key] !== '') {
      result[key] = source[key];
    }
  });
  return result;
};

export function buildMallSettingsPayload(
  mallCode: 'NSST',
  values?: MallSettingsSource,
): NaverSettingAttributes | undefined;
export function buildMallSettingsPayload(
  mallCode: 'KAKAOS',
  values?: MallSettingsSource,
): KakaoSettingAttributes | undefined;
export function buildMallSettingsPayload(
  mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>,
  values?: MallSettingsSource,
): undefined;
export function buildMallSettingsPayload(
  mallCode: ShoppingMalls,
  values?: MallSettingsSource,
): NaverSettingAttributes | KakaoSettingAttributes | undefined {
  if (!values) return undefined;
  if (mallCode === 'NSST') return pickDefined(values, NAVER_SETTING_KEYS);
  if (mallCode === 'KAKAOS') return pickDefined(values, KAKAO_SETTING_KEYS);
  return undefined;
}
