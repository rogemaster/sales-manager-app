import { Product, ProductSearch } from '@/features/products/types/product.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

const getProductsByDate = (dateType: string, startDateValue: string, endDateValue: string, data: Product[]) => {
  if (dateType === 'register') {
    return data.filter((item) => dayjs(item.createDate).isBetween(startDateValue, endDateValue, 'day', '[]'));
  }
  if (dateType === 'update') {
    return data.filter((item) => dayjs(item.updateDate).isBetween(startDateValue, endDateValue, 'day', '[]'));
  }
  return data;
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

export const getMockProducts = (ownerId: string, searchParams: ProductSearch, page: number, pageSize: number) => {
  const { dateType, startDate, endDate, saleType, categoryId, searchValue } = searchParams;
  const byOwner = MOCK_PRODUCT_DATA.filter((p) => p.ownerId === ownerId);
  const resultByDate = getProductsByDate(dateType, startDate, endDate, byOwner);
  const resultByType = getProductsBySaleType(saleType, resultByDate);
  const resultByCategory = getProductsByCategoryId(categoryId, resultByType);
  const filtered = getProductsBysearchValue(searchValue, resultByCategory);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const products = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { products, total, page, pageSize, totalPages };
};
