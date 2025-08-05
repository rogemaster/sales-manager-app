import { ProductSaleState } from '@/types/ProductInterface';

export const PRODUCT_SALE_TYPE: ProductSaleState[] = [
  {
    id: 'on-sale',
    name: '판매중'
  },
  {
    id: 'wait-sale',
    name: '판매대기'
  },
  {
    id: 'sold-out',
    name: '품절'
  },
  {
    id: 'sale-dis',
    name: '판매중지'
  }
]

export const PRODUCT_DATE_TYPE = [
  {
    id: 'register',
    name: '등록일'
  },
  {
    id: 'update',
    name: '수정일'
  }
]