import { ShoppingMalls } from '@/types/common.type';

export interface OrderSearchType {
  dateType: string;
  searchDate: Date[];
  orderStatus: string;
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

/*
주문번호 - orderNumber
쇼핑몰주문번호 - shopOrderNumber
주문상태 - orderStatus
결제일 - paymentDate
주문수집일 - orderCollectionDate

쇼핑몰명 - shoppingMall - 글로벌 쇼핑몰 인터페이스 참조
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
  shoppingMall: ShoppingMalls;
  shopProductId: string;
  orderProductName: string;
  orderPrice: number;
  orderTotalQuantity: number;
  orderOption?: string;
  orderSubOption?: string;
  orderSubTotalQuantity?: string;
  orderDeliveryType: string;
  orderDeliveryPrice: number;
  orderName: string;
  payeeName: string;
  orderPhoneNumber: string;
  payeePhoneNumber: string;
  orderZipCode: string;
  orderAddress: string;
  payeeZipCode: string;
  payeeAddress: string;
  deliveryMessage?: string;
}
