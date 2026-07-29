import { ShoppingMalls } from '@/types/common.type';

export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED'; // 과세/면세/영세
export type AdultProductType = 'GENERAL' | 'ADULT'; // 일반상품/성인상품

export type MallRegistrationStatus = 'success' | 'failed';

export interface MallRegistration {
  id: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  status: MallRegistrationStatus;
  registeredAt: string; // 마지막 전송 시각
  externalId?: string; // 성공 시 외부몰이 부여한 상품 ID
  errorMessage?: string; // 실패 시 사유
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
  mainImage: string | File;
  detailPage: string;
  option?: OptionCombination[];
  totalQuantity: number;
  subOption?: OptionCombination[];
  keyWords?: string[];
  createDate: Date;
  updateDate: Date;
  informationDisclosure: ProductInformationDisclosure;
  ownerId: string;
  originCountryCode?: string; // ORIGIN_COUNTRIES 코드('KR' 포함) 또는 'ETC'
  originCountryEtc?: string; // originCountryCode === 'ETC'일 때만 사용하는 자유텍스트
  taxType?: TaxType;
  adultProductType?: AdultProductType;
  registeredMalls?: MallRegistration[];
}

export interface ProductSaleState {
  id: string;
  name: string;
}

export type ProductStateType = 'ON_SALE' | 'WAIT_SALE' | 'SOLD_OUT' | 'SALE_DIS';

// 검색 관련 타입들
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

export type CreateProductRequest = Omit<Product, 'productId' | 'ownerId' | 'createDate' | 'updateDate'>;

export type ProductInformationDisclosure = {
  key: string;
  id: string;
  name: string;
  fields: {
    [key: string]: string | number | null;
  };
};
