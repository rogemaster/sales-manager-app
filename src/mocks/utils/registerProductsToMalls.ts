import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';

export const registerMockProductsToMalls = (items: MallRegistrationRequestItem[]): number => {
  const now = new Date().toISOString();
  let count = 0;

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    if (!product) return;
    if (!product.registeredMalls) product.registeredMalls = [];
    product.registeredMalls.push({
      id: `mr_${Date.now()}_${index}`,
      mallCode: item.mallCode,
      shoppingSettingId: item.shoppingSettingId,
      registeredAt: now,
    });
    count += 1;
  });

  return count;
};
