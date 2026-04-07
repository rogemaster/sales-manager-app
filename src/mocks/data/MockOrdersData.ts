import { Order } from '@/features/order/types/order.types';

// 샘플 주문 데이터
export const MOCK_ORDERS_DATA: Order[] = [
  {
    orderNumber: 'order_mock_sample_001',
    shopOrderNumber: '111111-222222',
    orderStatus: 'NEW_ORDER',
    paymentDate: '2025-10-27',
    orderCollectionDate: '2025-10-28',
    shoppingMallName: 'GMK',
    shoppingMallId: 'gadmin1111',
    shopProductId: 'G-111223344',
    orderProductName: '쇼핑몰 상품명11 입니다.',
    orderOption: '',
    orderPrice: 120000,
    orderTotalQuantity: 2,
    orderDeliveryType: 'FREE',
    orderDeliveryPrice: 0,
    orderName: '주문자1',
    payeeName: '수취자1',
    orderPhoneNumber: '01012345678',
    payeePhoneNumber: '01012345678',
    orderZipCode: '111-444',
    orderAddress: '주문자 주소 입력란',
    payeeZipCode: '111-444',
    payeeAddress: '수취인 주소 입력란',
  },
];
