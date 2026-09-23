import type { mallLinkedProductHistories, mallLinkedProducts } from '@/db/schema';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MallLinkSendAction } from '../types/mallLinkedProduct.types';
import { LinkedProductRow, splitSettingSnapshot } from './linkedProductRecord';
import { mergeProductSnapshot } from './mergeProductSnapshot';
import { MallSendOutcome } from './randomMallSend';

/**
 * 연동 건 쓰기 값 조립. DB 호출부(server/linkedProductSend.ts, 수정 route)는 읽기 → 여기 → 쓰기만 한다.
 * 규칙이 여기 모여 있어야 DB 없이 테스트할 수 있다 — PR#78에서 mock util 테스트가 사라진 자리를 메운다.
 */

export type SendActor = { ownerId: string; email: string };
export type NewLinkedRow = typeof mallLinkedProducts.$inferInsert;
export type HistoryRow = typeof mallLinkedProductHistories.$inferInsert;
export type ResendUpdate = Pick<NewLinkedRow, 'status' | 'externalProductId' | 'errorMessage' | 'lastSentAt'>;

/**
 * 새 연동 행. 몰·계정은 클라이언트 요청이 아니라 조회된 설정에서 가져온다 — 어긋난 쌍이 오면 몰/계정 필터가 갈라진다.
 * 스냅샷은 깊은 복사다. 얕은 복사면 중첩 객체가 오리지널과 공유되어 "오리지널 수정이 연동에 전파되지 않는다"가 깨진다.
 */
export const buildNewLinkedRow = ({
  id,
  actor,
  product,
  setting,
  outcome,
  now,
}: {
  id: string;
  actor: SendActor;
  product: Product;
  setting: ShoppingSetting;
  outcome: MallSendOutcome;
  now: Date;
}): NewLinkedRow => ({
  id,
  ownerId: actor.ownerId,
  mallCode: setting.mallCode,
  mallAccountId: setting.mallAccountId,
  mallId: setting.mallId,
  sourceProductId: product.productId,
  sourceShoppingSettingId: setting.id,
  status: outcome.status,
  externalProductId: outcome.externalProductId ?? null,
  errorMessage: outcome.errorMessage ?? null,
  productSnapshot: structuredClone(product),
  settingSnapshot: splitSettingSnapshot(setting),
  createdByEmail: actor.email,
  createdAt: now,
  lastSentAt: now,
  updatedAt: now,
});

/** externalProductId 유무가 "외부몰에 이 상품이 있는가"의 단일 판정 기준이다. */
export const resolveSendAction = (externalProductId: string | undefined): MallLinkSendAction =>
  externalProductId ? 'update' : 'register';

/**
 * 재전송 결과 반영. 스냅샷·updated_at은 넣지 않는다 — 재전송은 값을 고치는 행위가 아니다.
 * 실패해도 externalProductId를 지우지 않는다(외부몰 상품은 이전 값으로 살아있다). status는 "마지막 전송 성공 여부"다.
 */
export const buildResendUpdate = (
  currentExternalProductId: string | undefined,
  outcome: MallSendOutcome,
  now: Date,
): ResendUpdate => ({
  status: outcome.status,
  externalProductId: outcome.externalProductId ?? currentExternalProductId ?? null,
  errorMessage: outcome.status === 'success' ? null : (outcome.errorMessage ?? null),
  lastSentAt: now,
});

/** 전송·재전송 1회의 이력. 연동 건의 status·errorMessage는 덮어써지므로 회차별 결과는 여기에만 남는다. */
export const buildHistoryEntry = ({
  linkedProductId,
  actor,
  action,
  outcome,
  now,
}: {
  linkedProductId: string;
  actor: SendActor;
  action: MallLinkSendAction;
  outcome: MallSendOutcome;
  now: Date;
}): HistoryRow => ({
  linkedProductId,
  ownerId: actor.ownerId,
  action,
  status: outcome.status,
  externalProductId: outcome.externalProductId ?? null,
  errorMessage: outcome.errorMessage ?? null,
  source: outcome.source,
  sentByEmail: actor.email,
  sentAt: now,
});

/** null은 대상이 없어 건너뛴 건이다(남의 것·없는 것). 집계에서 뺀다. 예외는 실패로 센다. */
export const tallySendResults = (results: PromiseSettledResult<boolean | null>[]) => {
  const result = { totalCount: 0, successCount: 0, failCount: 0 };
  results.forEach((settled) => {
    if (settled.status === 'fulfilled' && settled.value === null) return;
    result.totalCount += 1;
    if (settled.status === 'fulfilled' && settled.value) result.successCount += 1;
    else result.failCount += 1;
  });
  return result;
};

export type SnapshotUpdate = Pick<NewLinkedRow, 'productSnapshot' | 'settingSnapshot' | 'updatedByEmail' | 'updatedAt'>;
export type BulkUpdate = Partial<
  Pick<NewLinkedRow, 'productSnapshot' | 'settingSnapshot' | 'sourceShoppingSettingId'>
> &
  Pick<NewLinkedRow, 'updatedByEmail' | 'updatedAt'>;

/**
 * 단건 저장의 SET. 스냅샷만 교체한다. mall_code·mall_account_id·mall_id가 여기 없으므로 무엇을 보내도 바뀌지 않는다 —
 * 연동 1건 = 특정 계정으로 등록된 외부몰 상품 1개라 계정이 바뀌면 다른 상품이다.
 * status·lastSentAt·externalProductId는 재전송의 소관이라 넣지 않는다.
 */
export const buildSnapshotUpdate = (
  body: { productSnapshot: Product; settingSnapshot: ShoppingSetting },
  email: string,
  now: Date,
): SnapshotUpdate => ({
  productSnapshot: structuredClone(body.productSnapshot),
  settingSnapshot: splitSettingSnapshot(body.settingSnapshot),
  updatedByEmail: email,
  updatedAt: now,
});

/** 일괄수정의 설정 교체는 같은 몰·같은 계정의 설정으로만 가능하다. 설정을 못 찾았으면(남의 것·없는 것) 불일치다. */
export const isBulkSettingMismatch = (
  row: Pick<LinkedProductRow, 'mallCode' | 'mallAccountId' | 'mallId'>,
  setting: ShoppingSetting | undefined,
): boolean =>
  !setting ||
  setting.mallCode !== row.mallCode ||
  setting.mallAccountId !== row.mallAccountId ||
  setting.mallId !== row.mallId;

/** 일괄수정 1건의 SET. 값을 비우는 요청(clearKeys)만 온 것도 상품 스냅샷을 다시 쓴다. */
export const buildBulkUpdate = (
  row: Pick<LinkedProductRow, 'productSnapshot'>,
  request: { productSnapshot?: Partial<Product>; clearKeys?: (keyof Product)[]; setting?: ShoppingSetting },
  email: string,
  now: Date,
): BulkUpdate => {
  const { productSnapshot, clearKeys, setting } = request;
  const touchesProduct = !!productSnapshot || (clearKeys?.length ?? 0) > 0;
  return {
    ...(touchesProduct
      ? { productSnapshot: mergeProductSnapshot(row.productSnapshot, productSnapshot, clearKeys) }
      : {}),
    ...(setting ? { settingSnapshot: splitSettingSnapshot(setting), sourceShoppingSettingId: setting.id } : {}),
    updatedByEmail: email,
    updatedAt: now,
  };
};
