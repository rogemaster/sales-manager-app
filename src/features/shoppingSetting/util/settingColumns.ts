import { shoppingSettings } from '@/db/schema';

/**
 * 설정 읽기 경로가 쓰는 select 목록.
 *
 * 계정(SHOPPING_ACCOUNT_PUBLIC_COLUMNS)과 달리 가려야 할 비밀 컬럼은 없지만, 목록을 한 곳에 두면
 * 새 컬럼이 늘었을 때 어느 경로가 그것을 안 돌려주는지 한눈에 보인다.
 */
export const SHOPPING_SETTING_COLUMNS = {
  id: shoppingSettings.id,
  ownerId: shoppingSettings.ownerId,
  mallAccountId: shoppingSettings.mallAccountId,
  mallCode: shoppingSettings.mallCode,
  mallId: shoppingSettings.mallId,
  nickname: shoppingSettings.nickname,
  isActive: shoppingSettings.isActive,
  productCondition: shoppingSettings.productCondition,
  salesPeriod: shoppingSettings.salesPeriod,
  shippingAddress: shoppingSettings.shippingAddress,
  returnAddress: shoppingSettings.returnAddress,
  mallSettings: shoppingSettings.mallSettings,
  createdAt: shoppingSettings.createdAt,
  updatedAt: shoppingSettings.updatedAt,
};
