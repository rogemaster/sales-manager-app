import 'server-only';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * 계정의 mallId가 바뀌면 그 계정에 딸린 설정의 사본도 따라 바꾼다.
 *
 * 설정은 shopping_accounts.mallId의 사본을 컬럼으로 들고 있다(조인 대신 사본을 쓰는 이유:
 * 계정이 삭제돼도 설정이 자기 표시값을 잃지 않아야 한다). 그 사본이 어긋나지 않게 하는 곳이 여기다.
 *
 * - updatedAt은 건드리지 않는다. 사용자가 설정을 고친 것이 아니므로, 갱신하면 "수정일시 기준"
 *   날짜 필터에서 손댄 적 없는 설정들이 튀어나온다.
 * - 연동상품의 settingSnapshot.mallId는 대상이 아니다. 스냅샷은 전송 시점의 기록이고
 *   오리지널 수정이 연동 데이터에 전파되지 않는 것이 도메인 규칙이다(domain-design.md).
 *
 * 계정 route가 이 함수를 부른다. 계정 route가 shopping_settings를 직접 쓰면 도메인 경계를 넘는다.
 */
export const syncSettingMallId = async (accountId: string, ownerId: string, mallId: string): Promise<void> => {
  await db
    .update(shoppingSettings)
    .set({ mallId })
    .where(and(eq(shoppingSettings.mallAccountId, accountId), eq(shoppingSettings.ownerId, ownerId)));
};
