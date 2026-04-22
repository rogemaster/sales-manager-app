import { Product } from '@/features/products/types/product.types';
import { generatorProductCode } from '@/utils/codeGenerator';
import { faker } from '@faker-js/faker';

export const createMockProduct = (data: Product) => {
  return {
    ...data,
    productId: generatorProductCode(),
    mainImage: faker.image.urlLoremFlickr({ width: 700, height: 700, category: 'cat' }),
  };
};
