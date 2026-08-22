import { ExcelTemplate } from '@/types/excel.type';

// 엑셀 양식 템플릿
export const PRODUCT_BULK_EXCEL_TEMPLATE: ExcelTemplate = {
  templateTitle: '양식 포함 항목:',
  template: [
    {
      key: 'customerCode',
      name: '고객상품코드',
      req: false,
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
    },
    {
      key: 'price',
      name: '판매가',
      req: true,
    },
    {
      key: 'state',
      name: '판매상태',
      req: true,
    },
    {
      key: 'deliveryType',
      name: '배송정책',
      req: true,
    },
    {
      key: 'deliveryPrice',
      name: '배송비',
      req: true,
    },
    {
      key: 'mainImage',
      name: '메인이미지',
      req: true,
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
      text: true,
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
      text: true,
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
      text: true,
    },
    {
      key: 'totalQuantity',
      name: '총수량',
      req: true,
    },
    {
      key: 'skuPrefix',
      name: 'SKU',
      req: false,
      text: true,
    },
    {
      key: 'subSkuPrefix',
      name: '추가SKU',
      req: false,
      text: true,
    },
    {
      key: 'keyWord',
      name: '키워드',
      req: false,
    },
  ],
};
