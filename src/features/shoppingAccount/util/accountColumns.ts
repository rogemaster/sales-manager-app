import { shoppingAccounts } from '@/db/schema';

/**
 * 읽기 경로가 쓰는 유일한 select 목록. password·apiKey가 없다.
 *
 * db.select()는 전체 컬럼을 돌려주므로, 읽기 route 셋(list·by-mall·GET :id)과
 * INSERT/UPDATE의 .returning() 중 한 곳이라도 이것을 안 쓰면 키가 새어 나간다.
 * 새 읽기 경로를 붙일 때 이 객체를 먼저 확인할 것.
 */
export const SHOPPING_ACCOUNT_PUBLIC_COLUMNS = {
  id: shoppingAccounts.id,
  ownerId: shoppingAccounts.ownerId,
  mallCode: shoppingAccounts.mallCode,
  mallId: shoppingAccounts.mallId,
  isActive: shoppingAccounts.isActive,
  nickname: shoppingAccounts.nickname,
  managerMd: shoppingAccounts.managerMd,
  phone: shoppingAccounts.phone,
  email: shoppingAccounts.email,
  domain: shoppingAccounts.domain,
  category: shoppingAccounts.category,
  createdAt: shoppingAccounts.createdAt,
  updatedAt: shoppingAccounts.updatedAt,
};
