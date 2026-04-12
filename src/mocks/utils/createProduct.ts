import { Product } from '@/features/products/types/product.types';

export const createMockProduct = (data: Product) => {
  const {} = data;

  return {
    status: 400,
    result: false,
    message: '',
  };
};
