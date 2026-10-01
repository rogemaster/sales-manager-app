import { ShoppingMalls } from '@/types/common.type';
import { DeliveryTypeId } from '@/shared/constant/delivery.constant';
import { BulkFailure } from '@/shared/utils/bulkResultAlert';

export interface OrderSearchType {
  dateType: string;
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallId: string;
  deliveryCompany: string;
  orderStatus: string;
  searchType: string;
  searchValue: string;
}

export interface OrderStatus {
  id: string;
  name: string;
}

export type OrderStatusTypes =
  | 'NEW_ORDER'
  | 'CONFIRMED_ORDER'
  | 'INVOICE_REGISTER'
  | 'INVOICE_COMPLETE'
  | 'REQUEST_CANCEL'
  | 'PROGRESS_CANCEL'
  | 'COMPLETE_CANCEL'
  | 'REQUEST_EXCHANGE'
  | 'PROGRESS_EXCHANGE'
  | 'COMPLETE_EXCHANGE'
  | 'REQUEST_RETURN'
  | 'PROGRESS_RETURN'
  | 'COMPLETE_RETURN';

export type OrderDateType = 'orderCollectionDate' | 'paymentDate' | 'invoiceRegisteredAt' | 'invoiceSentAt';

export type OrderSearchKey = 'orderName' | 'payeeName' | 'orderProductName' | 'orderNumber' | 'shopOrderNumber';

/*
주문번호 - orderNumber
쇼핑몰주문번호 - shopOrderNumber
주문상태 - orderStatus
결제일 - paymentDate
주문수집일 - orderCollectionDate

쇼핑몰명(코드) - mallCode - 글로벌 쇼핑몰 인터페이스 참조
쇼핑몰계정ID - mallId
쇼핑몰상품코드 - shopProductId
주문상품명 - orderProductName
총주문금액(실결제가) - orderPrice
주문수량 - orderTotalQuantity
주문옵션명? - orderOption
주문추가옵션명? - orderSubOption
주문추가옵션수량? - orderSubTotalQuantity
배송타입 - orderDeliveryType
배송비 - orderDeliveryPrice

주문자명 - orderName
수취인명 - payeeName
주문자연락처 - orderPhoneNumber
수취인연락처 - payeePhoneNumber
보낸사람우편번호 - orderZipCode
보낸사람주소 - orderAddress
받는사람우편번호 - payeeZipCode
받는사람주소 - payeeAddress
배송메세지? - deliveryMessage
*/

export interface Order {
  orderNumber: string;
  shopOrderNumber: string;
  orderStatus: OrderStatusTypes;
  paymentDate: string;
  orderCollectionDate: string;
  mallCode: ShoppingMalls;
  mallId: string;
  shopProductId: string;
  orderProductName: string;
  orderPrice: number;
  orderTotalQuantity: number;
  orderOption?: string;
  orderSubOption?: string;
  orderSubTotalQuantity?: string;
  orderDeliveryType: DeliveryTypeId;
  orderDeliveryPrice: number;
  orderName: string;
  payeeName: string;
  orderPhoneNumber: string;
  payeePhoneNumber: string;
  orderZipCode: string;
  orderAddress: string;
  orderDetailAddress?: string;
  payeeZipCode: string;
  payeeAddress: string;
  payeeDetailAddress?: string;
  deliveryMessage?: string;
  deliveryCompany?: string;   // 택배사
  invoiceNumber?: string;     // 송장번호
  invoiceRegisteredAt?: string; // 송장등록일 — 상태가 송장등록으로 바뀐 순간(서버 기록)
  invoiceSentAt?: string;       // 송장전송완료일 — 송장을 몰로 보내 완료된 순간(라운드 4)
  ownerId: string;
}

export interface OrderDetail extends Order {
  claim?: OrderClaim;
}

export type OrderClaimType = 'CANCEL' | 'EXCHANGE' | 'RETURN';

export interface OrderClaim {
  claimType: OrderClaimType;
  claimMessage: string;
  handlerNote?: string;
}

export interface OrderComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface OrderEditHistory {
  id: string;
  modifiedAt: string;
  modifiedBy: string;
  changedFields: string[];
}

/** POST /api/orders/status 응답. 부분 성공이 정상 결과다(bulkRequest.ts 선례). */
export interface BulkOrderStatusResult {
  successCount: number;
  failures: BulkFailure[];
}
