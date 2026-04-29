import { ProductStateType } from '@/features/products/types/product.types';

export interface HomeStats {
  total: number;
  onSale: number;
  soldOut: number;
  saleDis: number;
  waitSale: number;
}

export interface RecentProduct {
  productId: string;
  name: string;
  price: number;
  state: ProductStateType;
  createDate: string;
}
