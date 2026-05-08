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
  subOption?: OptionCombination[];
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  informationDisclosure: ProductInformationDisclosure;
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

// 기본옵션
export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

// 옵션 입력 상태 (확정 전 comma-separated string)
export interface ProductOptionDraft {
  id: string;
  name: string;
  values: string;
}

// 옵션 조합
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

export interface InformationDisclosure {
  id: string;
  name: string;
  fields: InfoDisclosureField[];
}

export type InformationDisclosureCategory = Pick<InformationDisclosure, 'id' | 'name'>;

export type CreateProductRequest = Omit<Product, 'productId' | 'createDate' | 'updateDate'>;

export type ProductInformationDisclosure = {
  key: string;
  id: string;
  name: string;
  fields: {
    [key: string]: string | number | null;
  };
};
