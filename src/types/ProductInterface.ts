export interface ProductSaleState {
  id: string;
  name: string;
}

export interface Product {
  productCode: string;
  name: string;
  categoryCode: string;
  netPrice: number;
  price: number;
  status: ProductStatusType;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string;
  detailPage: string;
  option: string;
  keyWord: string | null;
  createDate: Date;
  updateDate: Date;
}

export type ProductStatusType = 'ON_SALE' | 'WAIT_SALE' | 'SOLD_OUT' | 'SALE_DIS';
