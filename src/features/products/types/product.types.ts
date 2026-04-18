import { PRODUCT_INFO_DISC_TYPES } from '../constant/infomationDisclosure.constants';

export type ProductInfoDiscMap = typeof PRODUCT_INFO_DISC_TYPES;
export type ProductInfoDiscKey = keyof ProductInfoDiscMap;

// type FieldKeyOf<K extends ProductInfoDiscKey> = ProductInfoDiscMap[K]['fields'][number]['key'];

// type DisclosureValues<K extends ProductInfoDiscKey> = Partial<Record<FieldKeyOf<K>, string>>;

// interface ProductInfomationDisclosureBase<K extends ProductInfoDiscKey> {
//   type: K;
//   id: ProductInfoDiscMap[K]['id'];
//   name: ProductInfoDiscMap[K]['name'];
//   values: DisclosureValues<K>;
// }

// export type ProductInformationDisclosure = {
//   [K in ProductInfoDiscKey]: ProductInfomationDisclosureBase<K>;
// }[ProductInfoDiscKey];

export type ProductInformationDisclosure = {
  [K in ProductInfoDiscKey]: {
    type: K;
    id: ProductInfoDiscMap[K]['id'];
    name: ProductInfoDiscMap[K]['name'];
    values: Partial<Record<ProductInfoDiscMap[K]['fields'][number]['key'], string>>;
  };
}[ProductInfoDiscKey];

export interface ProductSaleState {
  id: string;
  name: string;
}

export interface Product {
  productId: string;
  customerCode?: string;
  name: string;
  categoryId: string;
  netPrice?: number;
  price: number;
  state: ProductStateType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: string;
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  infomationDisclosure: ProductInformationDisclosure;
}

export type ProductStateType = 'ON_SALE' | 'WAIT_SALE' | 'SOLD_OUT' | 'SALE_DIS';

// 검색 관련 타입들
export interface ProductSearchParams {
  category?: string;
  saleType?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface ProductSearch {
  dateType: string;
  startDate: string;
  endDate: string;
  saleType: string;
  categoryId: string;
  searchValue: string;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface ProductOptionDraft {
  id: string;
  name: string;
  values: string;
}

export interface OptionCombination {
  id: string;
  combination: string;
  values: { [key: string]: string };
  quantity: number;
  skuCode: string;
  optionPrice: number;
}

export interface InfoDisclosureBaseField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'textarea';
  required: boolean;
}

export interface ProductInfomationDisclosureType {
  id: string;
  name: string;
  fields: InfoDisclosureBaseField[];
}
