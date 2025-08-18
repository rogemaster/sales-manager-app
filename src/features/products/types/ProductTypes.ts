// Product 관련 타입 정의

export interface ProductSaleState {
  id: string;
  name: string;
}

export interface Product {
  productId: string;
  name: string;
  categoryId: string;
  netPrice: number;
  price: number;
  state: ProductStateType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string;
  detailPage: string;
  option: string;
  keyWord: string | null;
  createDate: Date;
  updateDate: Date;
}

export type ProductStateType = 'ON_SALE' | 'WAIT_SALE' | 'SOLD_OUT' | 'SALE_DIS';

// 필터 관련 타입들
export interface FilterOption {
  id: string;
  name: string;
}

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
  searchDate: Date[];
  saleType: string;
  categoryId: string;
  searchValue: string;
}
