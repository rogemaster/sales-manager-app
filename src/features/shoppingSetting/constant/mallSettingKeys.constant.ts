import { NaverSettingAttributes, KakaoSettingAttributes } from '../types/shoppingSetting.types';

/**
 * 몰 고유 설정의 허용 키와 각 키의 값 타입. 이 맵이 정본이다.
 *
 * Record<keyof X, ...>라 인터페이스에 필드를 늘리고 여기에 타입을 안 적으면 컴파일 에러가 난다 —
 * 키 목록과 타입 정보가 따로 놀아 조용히 어긋나는 것을 막는다.
 * 클라이언트(buildMallSettingsPayload)와 서버(sanitizeMallSettings)가 같은 곳을 읽어야 한다.
 */
export const NAVER_SETTING_FIELD_TYPES: Record<keyof NaverSettingAttributes, 'string' | 'boolean'> = {
  afterServiceContact: 'string',
  afterServiceGuide: 'string',
  purchaseReviewExposure: 'boolean',
  logisticsCompanyId: 'string',
  logisticsCenterId: 'string',
  certificationInfo: 'string',
  certificationExcludeReason: 'string',
};

export const KAKAO_SETTING_FIELD_TYPES: Record<keyof KakaoSettingAttributes, 'string' | 'boolean'> = {
  certs: 'string',
  additionalInfo: 'string',
  shoppingHowDisplayable: 'boolean',
  storeboardDisplayStatus: 'string',
};

// 키 목록은 맵에서 파생시킨다. Object.keys는 string[]을 돌려주므로 단언이 필요하다.
export const NAVER_SETTING_KEYS = Object.keys(NAVER_SETTING_FIELD_TYPES) as (keyof NaverSettingAttributes)[];
export const KAKAO_SETTING_KEYS = Object.keys(KAKAO_SETTING_FIELD_TYPES) as (keyof KakaoSettingAttributes)[];

/** 몰 고유 설정 문자열 값의 길이 상한. 외부몰 규칙이 아니라 jsonb에 거대한 값이 들어가는 것을 막는 용도다. */
export const MALL_SETTING_VALUE_MAX_LENGTH = 1000;
