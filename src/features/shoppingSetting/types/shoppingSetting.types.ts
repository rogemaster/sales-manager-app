import { PaginationMeta, ShoppingMalls } from '@/types/common.type';
import { BulkFailure } from '@/shared/utils/bulkResultAlert';

export type ProductCondition = 'NEW' | 'USED'; // 신상품 / 중고상품
export type SalesPeriod = 7 | 15 | 30 | 60 | 90;

/** 주소록 종류 — 출고지·반품지. 주소록 조회 화면·api·route가 같이 쓴다. */
export type MallAddressType = 'SHIPPING' | 'RETURN';

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
  deliveryCompany: string; // DELIVERY_COMPANY의 id. 택배 계약은 출고지 단위라 설정에 둔다
  shippingAddress: MallAddress | null;
  returnAddress: MallAddress | null;
  ownerId: string;
  // DB의 timestamp가 JSON에서 ISO 문자열로 오지만, 계정 타입과 같은 표기를 쓴다.
  // 화면은 dayjs(...).format('YYYY-MM-DD')로 찍는다.
  createdAt: Date;
  updatedAt: Date;
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
  mallAccountId: string; // ShoppingAccount.id — 계정으로 설정 옵션을 좁힐 때 쓴다
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
}

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;

/**
 * 삭제 대상 설정들에서 파생된 연동 데이터 건수.
 * 삭제 확인 창의 경고 문구에만 쓰인다 — 연동 데이터는 설정과 독립적이라 설정을 지워도 삭제되지 않는다.
 */
export interface LinkedProductCountResponse {
  totalCount: number;
}

/**
 * 설정 대량 삭제·사용여부 변경 결과.
 *
 * 구조가 BulkAccountResult와 같지만 합치지 않는다 — 호출 경로가 다르고 독립적으로 변할 수 있다.
 * neon-http에 트랜잭션이 없어 "전부 아니면 전무"를 약속할 수 없으므로 건별 결과가 정상 계약이다.
 */
export interface BulkSettingResult {
  successCount: number;
  failures: BulkFailure[];
}
