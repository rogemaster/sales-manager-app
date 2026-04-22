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
  mainImage: string | File;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: string;
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  infomationDisclosure: ProductInfomationDisclosure;
}

export interface ProductSaleState {
  id: string;
  name: string;
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

export interface InfoDisclosureField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'textarea';
  required: boolean;
}

export interface InfomationDisclosure {
  id: string;
  name: string;
  fields: InfoDisclosureField[];
}

export type InfomationDisclosureCategory = Pick<InfomationDisclosure, 'id' | 'name'>;

export type ProductInfomationDisclosure = {
  id: string;
  name: string;
  fields: {
    [key: string]: string | number | null;
  };
};
