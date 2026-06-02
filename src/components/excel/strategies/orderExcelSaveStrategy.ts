import { generatorOrderCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { Order } from '@/features/order/types/order.types';

export const orderExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Order[] => {
  return rows.map((r) => ({
    orderNumber: generatorOrderCode(),
    shopOrderNumber: (r['쇼핑몰주문번호'] as string) || '',
    orderStatus: (r['주문상태'] as Order['orderStatus']) || 'NEW_ORDER',
    paymentDate: (r['결제일'] as string) || '',
    orderCollectionDate: (r['주문수집일'] as string) || '',
    shoppingMallName: (r['쇼핑몰명'] as Order['shoppingMallName']) || 'GMK',
    shoppingMallId: (r['쇼핑몰ID'] as string) || '',
    shopProductId: (r['쇼핑몰상품코드'] as string) || '',
    orderProductName: (r['주문상품명'] as string) || '',
    orderPrice: Number(r['총주문금액']),
    orderTotalQuantity: Number(r['주문수량']),
    orderOption: (r['주문옵션명'] as string) || undefined,
    orderSubOption: (r['주문추가옵션명'] as string) || undefined,
    orderSubTotalQuantity: (r['주문추가옵션수량'] as string) || undefined,
    orderDeliveryType: (r['배송타입'] as Order['orderDeliveryType']) || 'FREE',
    orderDeliveryPrice: Number(r['배송비']),
    orderName: (r['주문자명'] as string) || '',
    payeeName: (r['수취인명'] as string) || '',
    orderPhoneNumber: (r['주문자연락처'] as string) || '',
    payeePhoneNumber: (r['수취인연락처'] as string) || '',
    orderZipCode: (r['주문자우편번호'] as string) || '',
    orderAddress: (r['주문자주소'] as string) || '',
    payeeZipCode: (r['받는사람우편번호'] as string) || '',
    payeeAddress: (r['받는사람주소'] as string) || '',
    deliveryMessage: (r['배송메세지'] as string) || undefined,
  }));
};
