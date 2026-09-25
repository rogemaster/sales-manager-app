import type { InferSelectModel } from 'drizzle-orm';
import type { mallLinkedProducts } from '@/db/schema';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';
import { MallLinkedProduct, MallLinkStatus } from '../types/mallLinkedProduct.types';

/**
 * setting_snapshot jsonb에 저장하는 모양. top-level 컬럼과 겹치는 5개를 뺀다.
 * mallAccountId·mallId·mallCode는 연동 건의 불변 식별 정보라 사본이 하나(컬럼)만 있어야 한다 —
 * 스냅샷에도 두면 두 값이 갈라질 수 있고, 어느 쪽이 정본인지 코드마다 달라진다.
 */
export type StoredSettingSnapshot = Omit<ShoppingSetting, 'id' | 'ownerId' | 'mallCode' | 'mallAccountId' | 'mallId'>;

export const splitSettingSnapshot = (setting: ShoppingSetting): StoredSettingSnapshot => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const {
    id: _id,
    ownerId: _ownerId,
    mallCode: _mallCode,
    mallAccountId: _accountId,
    mallId: _mallId,
    ...rest
  } = setting;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 오리지널 설정·요청 본문과 공유되어 스냅샷 독립성이 깨진다.
  return structuredClone(rest) as StoredSettingSnapshot;
};

/**
 * mall_linked_products 한 행. 스키마에서 파생한다 — 손으로 적으면 컬럼을 추가했을 때 이 타입과
 * 읽기 목록(LINKED_PRODUCT_COLUMNS)이 조용히 어긋난다. 생성 컬럼(product_name·product_state)은 검색 전용이라 읽지 않는다.
 */
export type LinkedProductRow = Omit<InferSelectModel<typeof mallLinkedProducts>, 'productName' | 'productState'>;

const toDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)));

export const toMallLinkedProduct = (row: LinkedProductRow): MallLinkedProduct => {
  // 식별 필드는 스냅샷보다 뒤에 펼친다 — 스냅샷에 같은 키가 섞여 들어와도 컬럼 값이 이긴다.
  const settingSnapshot = {
    ...row.settingSnapshot,
    createdAt: toDate(row.settingSnapshot.createdAt),
    updatedAt: toDate(row.settingSnapshot.updatedAt),
    id: row.sourceShoppingSettingId,
    ownerId: row.ownerId,
    mallCode: row.mallCode,
    mallAccountId: row.mallAccountId,
    mallId: row.mallId,
  } as ShoppingSetting;

  return {
    id: row.id,
    ownerId: row.ownerId,
    sourceProductId: row.sourceProductId,
    sourceShoppingSettingId: row.sourceShoppingSettingId,
    mallCode: row.mallCode as ShoppingMalls,
    status: row.status as MallLinkStatus,
    externalProductId: row.externalProductId ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    productSnapshot: row.productSnapshot,
    settingSnapshot,
    createdByEmail: row.createdByEmail,
    updatedByEmail: row.updatedByEmail ?? undefined,
    createdAt: row.createdAt,
    lastSentAt: row.lastSentAt,
    updatedAt: row.updatedAt,
  };
};
