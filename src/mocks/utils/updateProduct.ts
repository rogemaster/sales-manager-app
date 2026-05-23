import { Product } from '@/features/products/types/product.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';

export const updateMockProduct = (productId: string, update: Product): Product | undefined => {
  const index = MOCK_PRODUCT_DATA.findIndex((item) => item.productId === productId);
  if (index === -1) return undefined;

  MOCK_PRODUCT_DATA[index] = { ...MOCK_PRODUCT_DATA[index], ...update };
  return MOCK_PRODUCT_DATA[index];
};
