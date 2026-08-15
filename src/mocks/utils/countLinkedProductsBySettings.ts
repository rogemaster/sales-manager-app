import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

/**
 * 지정한 설정들에서 파생된 연동 데이터 건수를 센다.
 *
 * 설정을 삭제하기 전 사용자에게 보여줄 경고용 수치다. 연동 데이터는 설정과 독립적인
 * 데이터라 설정이 지워져도 삭제되지 않으며, 이 함수는 무엇도 변형하지 않는다.
 */
export const countMockLinkedProductsBySettings = (ownerId: string, settingIds: string[]): number => {
  const targets = new Set(settingIds);
  if (targets.size === 0) return 0;

  return MOCK_MALL_LINKED_PRODUCT_DATA.filter(
    (item) => item.ownerId === ownerId && targets.has(item.sourceShoppingSettingId),
  ).length;
};
