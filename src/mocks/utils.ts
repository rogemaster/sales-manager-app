import { Product, ProductSearch } from '@/features/products/types/product.types';
import { MOCK_PRODUCT_DATA } from './data/MockProductsData';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const getProductsByDate = (dateType: string, startDateValue: string, endDateValue: string) => {
  if (dateType === 'register') {
    return MOCK_PRODUCT_DATA.filter((item) =>
      dayjs(item.createDate).isBetween(startDateValue, endDateValue, 'day', '[]'),
    );
  }
  if (dateType === 'update') {
    return MOCK_PRODUCT_DATA.filter((item) =>
      dayjs(item.updateDate).isBetween(startDateValue, endDateValue, 'day', '[]'),
    );
  }
  return MOCK_PRODUCT_DATA;
};

const getProductsBySaleType = (type: string, data: Product[]) => {
  if (!type || type === 'ALL') {
    return data;
  }
  return data.filter((item) => item.state === type);
};

const getProductsByCategoryId = (id: string, data: Product[]) => {
  if (!id || id === 'ALL') {
    return data;
  }
  return data.filter((item) => item.categoryId === id);
};

const getProductsBysearchValue = (value: string, data: Product[]) => {
  if (!value) {
    return data;
  }
  return data.filter((item) => item.name.includes(value));
};

export const getMockProducts = (searchParams: ProductSearch) => {
  const { dateType, startDate, endDate, saleType, categoryId, searchValue } = searchParams;
  const resultByDate = getProductsByDate(dateType, startDate, endDate);
  const resultByType = getProductsBySaleType(saleType, resultByDate);
  const resultByCategory = getProductsByCategoryId(categoryId, resultByType);
  return getProductsBysearchValue(searchValue, resultByCategory);
};
