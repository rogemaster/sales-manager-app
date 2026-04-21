import { Product } from '@/features/products/types/product.types';
import { faker } from '@faker-js/faker';

export const createMockProduct = (data: Product) => {
  console.log('상품등록데이터', data);
  if (data.mainImage === null) {
    return {
      ...data,
      mainImage: faker.image.urlLoremFlickr({ width: 700, height: 700, category: 'cat' }),
    };
  }

  return {
    status: 400,
    result: false,
    message: '상품등록 실패',
  };
};
