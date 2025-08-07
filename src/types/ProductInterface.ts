export interface ProductSaleState {
  id: string;
  name: string;
}

export interface CategoryInterface {
  id: string;
  name: string;
}

export interface Product {
  productCode: string;
  name: string;
  categoryCode: string;
  netPrice: number;
  price: number;
  status: string;
  deliveryType: string;
  deliveryPrice: number;
  mainImage: string;
  detailPage: string;
  option: string;
  keyWord: string | null;
  createDate: Date;
  updateDate: Date;
}

export interface Category {
  code: string;
  name: string;
}
