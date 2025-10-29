import { TableTitleValue } from '@/types/common.type';

// 주문목록 헤드
// 순번
// 체크박스
// ---------------------- 상수선언값
// 주문수집일
// 주문번호
// 쇼핑몰 주문번호
// 쇼핑몰명 | 쇼핑몰ID
// 주문상태
// 쇼핑몰 상품코드
// 주문 상품명
// 옵션
// 주문자 | 수취인
// 주문자연락처 | 수취인연락처
// 주문수량
// 판매가
// 배송정보(ex 무료 | 선결제 2500원 | 착불)

export const ORDERLIST_TABLE_HEAD: TableTitleValue[] = [
  {
    id: 'orderCollectionDate',
    title: '주문수집일',
  },
  {
    id: 'orderNumber',
    title: '주문번호',
  },
  {
    id: 'shopOrderNumber',
    title: '쇼핑몰주문번호',
  },
  {
    id: 'shoppingMall',
    title: '쇼핑몰명',
  },
  {
    id: 'shopId',
    title: '쇼핑몰ID',
  },
  {
    id: 'orderStatus',
    title: '주문상태',
  },
  {
    id: 'shopProductId',
    title: '쇼핑몰상품코드',
  },
  {
    id: 'orderProductName',
    title: '주문상품명',
  },
  {
    id: 'orderOption',
    title: '옵션',
  },
  {
    id: 'orderName',
    title: '주문자명',
  },
  {
    id: 'payeeName',
    title: '수취인명',
  },
  {
    id: 'orderPhoneNumber',
    title: '주문자연락처',
  },
  {
    id: 'payeePhoneNumber',
    title: '수취인연락처',
  },
  {
    id: 'orderTotalQuantity',
    title: '주문수량',
  },
  {
    id: 'orderPrice',
    title: '판매가',
  },
  {
    id: 'orderDeliveryType',
    title: '배송정보',
  },
  {
    id: 'orderDeliveryPrice',
    title: '배송비',
  },
];
