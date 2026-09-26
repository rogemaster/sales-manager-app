import { ExcelTemplate } from '@/types/excel.type';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import { CATEGORIES } from '@/shared/constant/category.constant';

/**
 * 시트 컬럼 이름(헤더 글자). 파싱된 행의 키가 이 글자라서, 양식·저장 전략·미리보기가 모두 여기서 읽는다.
 * 컬럼 이름을 바꿀 때 이 표만 고치면 된다 — 한쪽에 한글 문자열이 남아 있으면 그 컬럼이 조용히 빈 값이 된다.
 */
export const PRODUCT_EXCEL_COL = {
  customerCode: '고객상품코드',
  name: '상품명',
  category: '카테고리',
  brand: '브랜드',
  manufacturer: '제조업체',
  modelName: '모델명',
  modelId: '모델번호',
  netPrice: '공급가',
  price: '판매가',
  state: '판매상태',
  deliveryType: '배송정책',
  deliveryPrice: '배송비',
  mainImage: '메인이미지',
  detailPage: '상세설명',
  option1Name: '옵션명1',
  option1Value: '옵션값1',
  option2Name: '옵션명2',
  option2Value: '옵션값2',
  subOptionName: '추가옵션명',
  subOptionValue: '추가옵션값',
  totalQuantity: '총수량',
  skuPrefix: 'SKU',
  subSkuPrefix: '추가SKU',
  keyWord: '키워드',
} as const;

// 엑셀 양식 템플릿
export const PRODUCT_BULK_EXCEL_TEMPLATE: ExcelTemplate = {
  templateTitle: '양식 포함 항목:',
  template: [
    {
      key: 'customerCode',
      name: PRODUCT_EXCEL_COL.customerCode,
      req: false,
      uniqueCode: true,
    },
    {
      key: 'name',
      name: PRODUCT_EXCEL_COL.name,
      req: true,
    },
    {
      key: 'category',
      name: PRODUCT_EXCEL_COL.category,
      // 네이버가 카테고리를 요구한다 — 입력 필수는 가장 엄격한 몰을 따른다(domain-design.md).
      // 예전에는 선택이고 적은 글자를 그대로 저장해, 코드(c00001)를 알아야 했고 빈 값 상품이 전송 불가로 남았다.
      req: true,
      allowed: CATEGORIES.map(({ name }) => name),
    },
    {
      key: 'brand',
      name: PRODUCT_EXCEL_COL.brand,
      req: true,
    },
    {
      key: 'manufacturer',
      name: PRODUCT_EXCEL_COL.manufacturer,
      req: true,
    },
    {
      key: 'modelName',
      name: PRODUCT_EXCEL_COL.modelName,
      req: false,
    },
    {
      key: 'modelId',
      name: PRODUCT_EXCEL_COL.modelId,
      req: false,
    },
    {
      key: 'netPrice',
      name: PRODUCT_EXCEL_COL.netPrice,
      req: false,
      numeric: true,
    },
    {
      key: 'price',
      name: PRODUCT_EXCEL_COL.price,
      req: true,
      numeric: true,
    },
    {
      key: 'state',
      name: PRODUCT_EXCEL_COL.state,
      req: true,
      // 사용자가 시트에 적는 값은 코드가 아니라 표시명이다. 정본은 화면 Select와 같은 상수를 쓴다.
      allowed: PRODUCT_STATUS.map(({ name }) => name),
    },
    {
      key: 'deliveryType',
      name: PRODUCT_EXCEL_COL.deliveryType,
      req: true,
      allowed: DELIVERY_TYPE_OPTION.map(({ name }) => name),
    },
    {
      key: 'deliveryPrice',
      name: PRODUCT_EXCEL_COL.deliveryPrice,
      req: true,
      numeric: true,
    },
    {
      key: 'mainImage',
      name: PRODUCT_EXCEL_COL.mainImage,
      req: true,
      // 외부 이미지 주소를 받는다. 업로드 시 확인하고, 저장 시 R2로 가져와 key로 저장한다.
      remoteImage: true,
    },
    {
      key: 'detailPage',
      name: PRODUCT_EXCEL_COL.detailPage,
      req: true,
    },
    {
      key: 'option1Name',
      name: PRODUCT_EXCEL_COL.option1Name,
      req: false,
    },
    {
      key: 'option1Value',
      name: PRODUCT_EXCEL_COL.option1Value,
      req: false,
    },
    {
      key: 'option2Name',
      name: PRODUCT_EXCEL_COL.option2Name,
      req: false,
    },
    {
      key: 'option2Value',
      name: PRODUCT_EXCEL_COL.option2Value,
      req: false,
    },
    {
      key: 'subOptionName',
      name: PRODUCT_EXCEL_COL.subOptionName,
      req: false,
    },
    {
      key: 'subOptionValue',
      name: PRODUCT_EXCEL_COL.subOptionValue,
      req: false,
    },
    {
      key: 'totalQuantity',
      name: PRODUCT_EXCEL_COL.totalQuantity,
      req: true,
      numeric: true,
    },
    {
      key: 'skuPrefix',
      name: PRODUCT_EXCEL_COL.skuPrefix,
      req: false,
    },
    {
      key: 'subSkuPrefix',
      name: PRODUCT_EXCEL_COL.subSkuPrefix,
      req: false,
    },
    {
      key: 'keyWord',
      name: PRODUCT_EXCEL_COL.keyWord,
      req: false,
    },
  ],
};
