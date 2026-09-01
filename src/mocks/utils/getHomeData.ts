import dayjs from 'dayjs';
import { Product } from '@/features/products/types/product.types';
import { HomeStats, RecentProduct } from '@/features/home/types/home.types';

// 상품 목록은 호출자가 넘긴다 — 상품이 Neon에 있어 MSW가 직접 읽을 수 없다.

export const getMockHomeStats = (products: Product[], ownerId: string): HomeStats => {
  const owned = products.filter((p) => p.ownerId === ownerId);
  const total = owned.length;
  const onSale = owned.filter((p) => p.state === 'ON_SALE').length;
  const soldOut = owned.filter((p) => p.state === 'SOLD_OUT').length;
  const saleDis = owned.filter((p) => p.state === 'SALE_DIS').length;
  const waitSale = owned.filter((p) => p.state === 'WAIT_SALE').length;

  return { total, onSale, soldOut, saleDis, waitSale };
};

export const getMockRecentProducts = (products: Product[], ownerId: string): RecentProduct[] => {
  return products
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => dayjs(b.createDate).valueOf() - dayjs(a.createDate).valueOf())
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      state: p.state,
      createDate: dayjs(p.createDate).format('YYYY-MM-DD'),
    }));
};
