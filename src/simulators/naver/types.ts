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

export type NaverProductOrderStatus = 'PAYED' | 'DELIVERING';
export type NaverPlaceOrderStatus = 'NOT_YET' | 'OK';

export interface NaverOrderParty {
  name: string;
  tel: string;
}

export interface NaverShippingAddress {
  name: string;
  tel: string;
  zipCode: string;
  baseAddress: string;
  detailAddress: string;
}

/** 주문 당시 값. 상품이 나중에 바뀌어도 주문은 그대로다. */
export interface NaverProductOrderPayload {
  productName: string;
  optionValues: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  totalPaymentAmount: number;
  deliveryFeeType: NaverDeliveryFeeType;
  deliveryFeeAmount: number;
  orderer: NaverOrderParty;
  shippingAddress: NaverShippingAddress;
  shippingMemo: string | null;
}

/** 생성 함수의 결과. 번호·상태는 서비스가 붙인다. */
export interface NaverProductOrderDraft {
  productNo: number;
  paymentDate: Date;
  payload: NaverProductOrderPayload;
}

export interface NaverStoredProductOrder {
  productOrderId: string;
  orderId: string;
  sellerId: string;
  productNo: number;
  productOrderStatus: NaverProductOrderStatus;
  placeOrderStatus: NaverPlaceOrderStatus;
  paymentDate: Date;
  /** 시뮬레이터가 이 행을 만든 시각. 결제일은 무작위 과거이고 lastChangedAt은 상태 변경 때 덮어써져, 생성 시점은 여기만 남는다. */
  createdAt: Date;
  lastChangedAt: Date;
  deliveryCompany: string | null;
  trackingNumber: string | null;
  dispatchedAt: Date | null;
  payload: NaverProductOrderPayload;
}

export interface NaverDispatchItem {
  productOrderId: string;
  deliveryCompanyCode: string;
  trackingNumber: string;
}

export type NaverOrderFailCode = 'NOT_FOUND' | 'INVALID_STATUS' | 'NOT_CONFIRMED' | 'INVALID_INPUT';

export interface NaverOrderFailInfo {
  productOrderId: string;
  code: NaverOrderFailCode;
  message: string;
}

/** 발주확인·발송처리 응답. 건별 부분 성공이 정상 결과다. */
export interface NaverOrderBatchResult {
  successProductOrderIds: string[];
  failProductOrderInfos: NaverOrderFailInfo[];
}

export interface NaverProductOrderResponse {
  productOrderId: string;
  orderId: string;
  productOrderStatus: NaverProductOrderStatus;
  placeOrderStatus: NaverPlaceOrderStatus;
  paymentDate: string;
  lastChangedDate: string;
  productNo: number;
  productName: string;
  optionValues: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  totalPaymentAmount: number;
  deliveryFeeType: NaverDeliveryFeeType;
  deliveryFeeAmount: number;
  orderer: NaverOrderParty;
  shippingAddress: NaverShippingAddress;
  shippingMemo: string | null;
  delivery: { deliveryCompany: string; trackingNumber: string; dispatchedDate: string } | null;
  /** 클레임은 이번 범위 밖(설계 결정 3). 자리만 둔다. */
  claim: null;
}

/** 다음 페이지의 시작점 — 이 주문(변경 시각, 번호) "뒤부터" 읽는다. 응답에는 인코딩된 문자열로 나간다. */
export interface NaverProductOrderCursor {
  lastChangedAt: Date;
  productOrderId: string;
}

export interface NaverProductOrderListResponse {
  productOrders: NaverProductOrderResponse[];
  /** 다음 페이지가 없으면 null. 그대로 cursor 쿼리에 넣는다. */
  nextCursor: string | null;
}
