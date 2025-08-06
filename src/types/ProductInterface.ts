export interface ProductSaleState {
  id: string;
  name: string;
}

export interface CategoryInterface {
  id: string;
  name: string;
}

// 배송 타입 값 import
import { DeliveryTypeValue } from '@/constant/Product';

export interface Product {
  productCode: string;
  productName: string;
  categoryCode: string;
  productNetPrice: number;
  productPrice: number;
  productStatus: string;
  productCreateDate: Date;
  productUpdateDate: Date;
  deliveryType: DeliveryTypeValue;
}

export interface DeliveryType {
  type: DeliveryTypeValue;
  name: string;
}
