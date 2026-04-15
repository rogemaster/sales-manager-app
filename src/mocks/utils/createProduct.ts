import { Product } from '@/features/products/types/product.types';

export const createMockProduct = (data: Product) => {
  console.log('상품등록데이터', data);

  return {
    status: 400,
    result: false,
    message: '',
  };
};
