import { ExcelTemplate } from '@/types/excel.type';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';

// 엑셀 양식 템플릿
export const PRODUCT_BULK_EXCEL_TEMPLATE: ExcelTemplate = {
  templateTitle: '양식 포함 항목:',
  template: [
    {
      key: 'customerCode',
      name: '고객상품코드',
      req: false,
      uniqueCode: true,
    },
    {
      key: 'name',
      name: '상품명',
      req: true,
    },
    {
      key: 'category',
      name: '카테고리',
      req: false,
    },
    {
      key: 'brand',
      name: '브랜드',
      req: true,
    },
    {
      key: 'manufacturer',
      name: '제조업체',
      req: true,
    },
    {
      key: 'modelName',
      name: '모델명',
      req: false,
    },
    {
      key: 'modelId',
      name: '모델번호',
      req: false,
    },
    {
      key: 'netPrice',
      name: '공급가',
      req: false,
      numeric: true,
    },
    {
      key: 'price',
      name: '판매가',
      req: true,
      numeric: true,
    },
    {
      key: 'state',
      name: '판매상태',
      req: true,
      // 사용자가 시트에 적는 값은 코드가 아니라 표시명이다. 정본은 화면 Select와 같은 상수를 쓴다.
      allowed: PRODUCT_STATUS.map(({ name }) => name),
    },
    {
      key: 'deliveryType',
      name: '배송정책',
      req: true,
      allowed: DELIVERY_TYPE_OPTION.map(({ name }) => name),
    },
    {
      key: 'deliveryPrice',
      name: '배송비',
      req: true,
      numeric: true,
    },
    {
      key: 'mainImage',
      name: '메인이미지',
      req: true,
      // 외부 이미지 주소를 받는다. 업로드 시 확인하고, 저장 시 R2로 가져와 key로 저장한다.
      remoteImage: true,
    },
    {
      key: 'detailPage',
      name: '상세설명',
      req: true,
    },
    {
      key: 'option1Name',
      name: '옵션명1',
      req: false,
    },
    {
      key: 'option1Value',
      name: '옵션값1',
      req: false,
    },
    {
      key: 'option2Name',
      name: '옵션명2',
      req: false,
    },
    {
      key: 'option2Value',
      name: '옵션값2',
      req: false,
    },
    {
      key: 'subOptionName',
      name: '추가옵션명',
      req: false,
    },
    {
      key: 'subOptionValue',
      name: '추가옵션값',
      req: false,
    },
    {
      key: 'totalQuantity',
      name: '총수량',
      req: true,
      numeric: true,
    },
    {
      key: 'skuPrefix',
      name: 'SKU',
      req: false,
    },
    {
      key: 'subSkuPrefix',
      name: '추가SKU',
      req: false,
    },
    {
      key: 'keyWord',
      name: '키워드',
      req: false,
    },
  ],
};
