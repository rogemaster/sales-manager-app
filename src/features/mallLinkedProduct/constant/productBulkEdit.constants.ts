import { Product } from '@/features/products/types/product.types';

/**
 * 일괄수정 화면의 체크박스 1개가 커버하는 Product 키들.
 *
 * 대부분 1:1이지만, 값이 서로에게 종속된 필드는 한 체크박스로 묶는다 —
 * 배송비는 배송방법에, 원산지 기타 입력은 원산지 코드에 종속되므로
 * 따로 체크할 수 있게 두면 반쪽만 바뀐 상태가 만들어진다.
 *
 * productId·ownerId·createDate·updateDate는 일괄수정 대상이 아니라 여기 없다.
 *
 * mainImage도 의도적으로 빠져 있다. 타입상으로는 이제 가능하지만(폼의 File 유니온이 제거됨),
 * "N개 상품에 같은 이미지를 넣는다"가 원하는 동작인지 확인된 바 없어 제외를 유지한다.
 */
export const PRODUCT_BULK_EDIT_GROUPS = {
  customerCode: ['customerCode'],
  name: ['name'],
  categoryId: ['categoryId'],
  keyWords: ['keyWords'],
  state: ['state'],
  netPrice: ['netPrice'],
  price: ['price'],
  totalQuantity: ['totalQuantity'],
  delivery: ['deliveryType', 'deliveryPrice'],
  brand: ['brand'],
  manufacturer: ['manufacturer'],
  modelName: ['modelName'],
  modelId: ['modelId'],
  originCountry: ['originCountryCode', 'originCountryEtc'],
  taxType: ['taxType'],
  adultProductType: ['adultProductType'],
  detailPage: ['detailPage'],
  option: ['option', 'subOption'],
  informationDisclosure: ['informationDisclosure'],
} as const satisfies Record<string, readonly (keyof Product)[]>;

export type ProductBulkEditGroupKey = keyof typeof PRODUCT_BULK_EDIT_GROUPS;

export type ProductBulkEditChecked = Partial<Record<ProductBulkEditGroupKey, boolean>>;

/** 체크했으면 값이 반드시 있어야 하는 그룹 — Product 타입에서 optional(?)이 아닌 필드를 커버한다. */
export const REQUIRED_BULK_EDIT_GROUPS: ProductBulkEditGroupKey[] = [
  'name',
  'categoryId',
  'price',
  'state',
  'totalQuantity',
  'delivery',
  'detailPage',
  'brand',
  'manufacturer',
  'informationDisclosure',
];
