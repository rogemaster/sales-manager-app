import { PaginationMeta, ShoppingMalls } from '@/types/common.type';

export type ProductCondition = 'NEW' | 'USED'; // 신상품 / 중고상품
export type SalesPeriod = 7 | 15 | 30 | 60 | 90;

export interface MallAddress {
  code: string; // 출고지코드 / 반품지코드 (몰 내부 식별자)
  name: string; // 출고지명 / 반품지명
  zipCode: string;
  address: string;
  addressDetail: string;
}

interface ShoppingSettingBase {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
  mallId: string;
  nickname: string;
  isActive: boolean;
  productCondition: ProductCondition;
  salesPeriod: SalesPeriod;
  shippingAddress: MallAddress | null;
  returnAddress: MallAddress | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NaverSettingAttributes {
  afterServiceContact?: string; // A/S 전화번호
  afterServiceGuide?: string; // A/S 안내문구
  purchaseReviewExposure?: boolean; // 구매평 노출 설정
  logisticsCompanyId?: string; // 풀필먼트 물류사 ID (사용 시만)
  logisticsCenterId?: string; // 풀필먼트 물류센터 ID (사용 시만)
  certificationInfo?: string; // 인증정보
  certificationExcludeReason?: string; // 인증 예외처리 사유
}

export interface KakaoSettingAttributes {
  certs?: string; // 인증정보
  additionalInfo?: string; // 부가정보 (선물포장/맞춤제작/반품가능여부)
  shoppingHowDisplayable?: boolean; // 쇼핑하우 전시여부
  storeboardDisplayStatus?: string; // 스토어보드 전시상태
}

export type ShoppingSetting =
  | (ShoppingSettingBase & { mallCode: 'NSST'; mallSettings?: NaverSettingAttributes })
  | (ShoppingSettingBase & { mallCode: 'KAKAOS'; mallSettings?: KakaoSettingAttributes })
  | (ShoppingSettingBase & { mallCode: Exclude<ShoppingMalls, 'NSST' | 'KAKAOS'>; mallSettings?: never });

export interface ShoppingSettingFormValues extends ShoppingSettingBase {
  mallCode: ShoppingMalls;
  mallSettings?: Partial<NaverSettingAttributes & KakaoSettingAttributes>;
}

export interface ShoppingSettingSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallAccountId: string; // 'ALL' 기본값, ShoppingAccount.id 참조
  searchValue: string;
}

export interface GetShoppingSettingsResponse extends PaginationMeta {
  settings: ShoppingSetting[];
}

export interface AvailableMallAccount {
  id: string; // ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  settingCount: number;
}

/** 활성(isActive) 설정만 추린 선택용 옵션 — 쇼핑몰 전송 대상 선택, 연동 목록 필터 등에서 쓴다. */
export interface ActiveShoppingSettingOption {
  id: string; // ShoppingSetting.id
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
}

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;
