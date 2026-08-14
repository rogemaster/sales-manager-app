export type TaxType = 'TAXABLE' | 'TAX_FREE' | 'ZERO_RATED'; // 과세/면세/영세
export type AdultProductType = 'GENERAL' | 'ADULT'; // 일반상품/성인상품

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

  /** 몰 카탈로그 매칭·검색 노출에 쓰이는 상품 공통 정보 */
  brand: string; // 카카오는 giftBrandId 키로 전송하지만 프론트는 이 필드 하나만 갖는다
  manufacturer: string;
  modelName?: string;
  modelId?: string;
}

export interface ProductSaleState {
  id: string;
  name: string;
}

export type ProductStateType = 'ON_SALE' | 'WAIT_SALE' | 'SOLD_OUT' | 'SALE_DIS';

// 검색 관련 타입들
export type ProductSearchType = 'productName' | 'productCode';

/**
 * `POST /api/products/list` 요청 필터.
 * 상품목록(`/products/list`)과 쇼핑몰 상품등록(`/shopping/register`)이 같은 엔드포인트를 쓰므로
 * 두 화면의 검색 필터 store는 형태가 달라도 이 타입 하나로 수렴한다.
 */
export interface ProductSearch {
  dateType: string;
  startDate: string;
  endDate: string;
  saleType: string;
  categoryId: string;
  searchType: ProductSearchType;
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
