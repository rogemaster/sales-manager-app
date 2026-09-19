/**
 * 가짜 네이버 스마트스토어의 타입. 우리 도메인 타입을 import하지 않는다 —
 * 가짜 외부몰이 우리 Product를 그대로 받으면 잘못된 매핑이 조용히 통과한다.
 * 필드 구성은 우리 Product·ShoppingSetting에서 나왔고 이름만 네이버 것을 빌렸다.
 */
export type NaverStatusType = 'WAIT' | 'SALE' | 'OUTOFSTOCK' | 'SUSPENSION';
export type NaverDeliveryFeeType = 'FREE' | 'CONDITIONAL_FREE' | 'PAID' | 'CHARGE_RECEIVED';
export type NaverTaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED';
export type NaverAddressType = 'SHIPPING' | 'RETURN';

export interface NaverImage {
  url: string;
}

export interface NaverProductImages {
  representativeImage: NaverImage;
  optionalImages?: NaverImage[];
}

export interface NaverOptionCombination {
  values: Record<string, string>;
  quantity: number;
  skuCode: string;
  optionPrice: number;
}

/** 네이버는 deliveryInfo.deliveryFee 아래로 한 겹 더 들어가지만, 우리 Product는 두 값이 나란히 있어 평탄화했다. */
export interface NaverDeliveryInfo {
  deliveryFeeType: NaverDeliveryFeeType;
  baseFee: number;
  deliveryCompany: string;
  shippingAddressId: string;
  returnAddressId: string;
}

export interface NaverProductRequest {
  name: string;
  statusType: NaverStatusType;
  leafCategoryId: string;
  detailContent: string;
  images: NaverProductImages;
  salePrice: number;
  stockQuantity: number;
  deliveryInfo: NaverDeliveryInfo;
  brandName: string;
  manufacturerName: string;
  productInfoProvidedNotice: Record<string, unknown>;
  sellerManagementCode?: string;
  modelName?: string;
  modelId?: string;
  taxType?: NaverTaxType;
  originAreaCode?: string;
  minorPurchasable?: boolean;
  sellerTags?: string[];
  optionCombinations?: NaverOptionCombination[];
}

export interface NaverSeller {
  id: string;
  apiKey: string;
  name: string;
}

export interface NaverAddress {
  addressId: string;
  sellerId: string;
  addressType: NaverAddressType;
  name: string;
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface NaverStoredProduct {
  productNo: number;
  sellerId: string;
  name: string;
  statusType: NaverStatusType;
  payload: NaverProductRequest;
}

export type InvalidInputType = 'REQUIRED' | 'TYPE' | 'LENGTH' | 'RANGE' | 'ENUM' | 'NOT_FOUND' | 'DUPLICATE';

export interface InvalidInput {
  name: string;
  type: InvalidInputType;
  message: string;
}

export type SimulatorFailureReason = 'UNAUTHORIZED' | 'NOT_FOUND' | 'INVALID' | 'DUPLICATE';

/** 서비스는 HTTP를 모른다. route가 이 유니온만 상태코드로 번역한다. */
export type SimulatorResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: SimulatorFailureReason; invalidInputs: InvalidInput[] };
