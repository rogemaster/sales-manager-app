import 'server-only';
import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts, products, shoppingAccounts, shoppingSettings } from '@/db/schema';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { SHOPPING_SETTING_COLUMNS } from '@/features/shoppingSetting/util/settingColumns';
import { ShoppingMalls } from '@/types/common.type';
import { mapWithConcurrency } from '@/shared/utils/concurrency';
import {
  CreateMallLinkedProductsResult,
  MallLinkedProductRequestItem,
  ResendMallLinkedProductsResult,
} from '../types/mallLinkedProduct.types';
import { toMallLinkedProduct } from '../util/linkedProductRecord';
import { MALL_LINK_SEND_CONCURRENCY } from '../constant/mallLinkedProduct.constants';
import {
  buildHistoryEntry,
  buildNewLinkedRow,
  buildResendUpdate,
  resolveSendAction,
  SendActor,
  tallySendResults,
} from '../util/linkedProductWrite';
import { LINKED_PRODUCT_COLUMNS, recordHistory } from './linkedProductStore';
import { sendToMall } from './sendToMall';

/** 계정 id → API Key. 같은 워크스페이스 계정만 읽는다. 키는 이 함수 밖(응답)으로 나가지 않는다. */
const loadApiKeys = async (ownerId: string, accountIds: string[]): Promise<Map<string, string>> => {
  if (accountIds.length === 0) return new Map();
  const rows = await db
    .select({ id: shoppingAccounts.id, apiKey: shoppingAccounts.apiKey })
    .from(shoppingAccounts)
    .where(and(inArray(shoppingAccounts.id, accountIds), eq(shoppingAccounts.ownerId, ownerId)));
  return new Map(rows.map(({ id, apiKey }) => [id, apiKey]));
};

/**
 * 상품 × 설정을 외부몰로 보내고 연동 건을 새로 만든다. 같은 조합이 있어도 항상 새 건이다(연동 1건 = 외부몰 상품 1개).
 * 클라이언트는 id만 보내고 서버가 원본을 읽어 스냅샷을 만든다 — 어긋날 여지가 없게 하는 생성 계약이다.
 * 쓰기 순서는 외부 전송 → 연동 행 → 이력. neon-http에 트랜잭션이 없어 건별 결과가 정상 계약이다.
 */
export const sendNewLinkedProducts = async (
  actor: SendActor,
  // mallCode는 받지 않는다 — 몰은 조회한 설정에서 읽는다(요청 스키마도 버린다).
  items: Pick<MallLinkedProductRequestItem, 'productId' | 'shoppingSettingId'>[],
): Promise<CreateMallLinkedProductsResult> => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const settingIds = [...new Set(items.map((item) => item.shoppingSettingId))];

  const [productRows, settingRows] = await Promise.all([
    productIds.length
      ? db
          .select()
          .from(products)
          .where(and(inArray(products.productId, productIds), eq(products.ownerId, actor.ownerId)))
      : Promise.resolve([]),
    settingIds.length
      ? db
          .select(SHOPPING_SETTING_COLUMNS)
          .from(shoppingSettings)
          .where(and(inArray(shoppingSettings.id, settingIds), eq(shoppingSettings.ownerId, actor.ownerId)))
      : Promise.resolve([]),
  ]);

  const productById = new Map(productRows.map((row) => [row.productId, row as unknown as Product]));
  const settingById = new Map(settingRows.map((row) => [row.id, row as unknown as ShoppingSetting]));
  const apiKeys = await loadApiKeys(actor.ownerId, [...new Set(settingRows.map((row) => row.mallAccountId))]);

  const results = await mapWithConcurrency(items, MALL_LINK_SEND_CONCURRENCY, async (item) => {
    const product = productById.get(item.productId);
    const setting = settingById.get(item.shoppingSettingId);
    if (!product || !setting) return null;

    // mallCode는 클라이언트가 보낸 item이 아니라 조회된 설정에서 가져온다 — 어긋난 쌍이 오면 몰/계정 필터가 갈라진다.
    const mallCode = setting.mallCode as ShoppingMalls;
    const outcome = await sendToMall({
      ownerId: actor.ownerId,
      mallCode,
      product,
      setting,
      apiKey: apiKeys.get(setting.mallAccountId),
    });

    const now = new Date();
    const id = `mlp_${randomUUID().slice(0, 8)}`;
    await db.insert(mallLinkedProducts).values(buildNewLinkedRow({ id, actor, product, setting, outcome, now }));
    await recordHistory(buildHistoryEntry({ linkedProductId: id, actor, action: 'register', outcome, now }));

    return outcome.status === 'success';
  });

  results.forEach((settled) => {
    if (settled.status === 'rejected') console.error('연동 전송 중 에러:', settled.reason);
  });
  return tallySendResults(results);
};

/**
 * 연동 건의 현재 스냅샷을 다시 보낸다. 스냅샷·updated_at은 건드리지 않는다 — 재전송은 값을 고치는 행위가 아니다.
 * external_product_id가 있으면 수정 전송이고, 실패해도 그 값을 지우지 않는다(외부몰 상품은 이전 값으로 살아있다).
 */
export const resendLinkedProducts = async (
  actor: SendActor,
  ids: string[],
): Promise<ResendMallLinkedProductsResult> => {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return { totalCount: 0, successCount: 0, failCount: 0 };

  const rows = await db
    .select(LINKED_PRODUCT_COLUMNS)
    .from(mallLinkedProducts)
    .where(and(inArray(mallLinkedProducts.id, uniqueIds), eq(mallLinkedProducts.ownerId, actor.ownerId)));
  const linkedById = new Map(rows.map((row) => [row.id, toMallLinkedProduct(row)]));
  const apiKeys = await loadApiKeys(actor.ownerId, [...new Set(rows.map((row) => row.mallAccountId))]);

  const results = await mapWithConcurrency(uniqueIds, MALL_LINK_SEND_CONCURRENCY, async (id) => {
    const linked = linkedById.get(id);
    if (!linked) return null;

    const action = resolveSendAction(linked.externalProductId);
    const outcome = await sendToMall({
      ownerId: actor.ownerId,
      mallCode: linked.mallCode,
      product: linked.productSnapshot,
      setting: linked.settingSnapshot,
      externalProductId: linked.externalProductId,
      apiKey: apiKeys.get(linked.settingSnapshot.mallAccountId),
      linkedProductId: linked.id,
    });

    const now = new Date();
    await db
      .update(mallLinkedProducts)
      .set(buildResendUpdate(linked.externalProductId, outcome, now))
      .where(and(eq(mallLinkedProducts.id, id), eq(mallLinkedProducts.ownerId, actor.ownerId)));

    await recordHistory(buildHistoryEntry({ linkedProductId: id, actor, action, outcome, now }));

    return outcome.status === 'success';
  });

  results.forEach((settled) => {
    if (settled.status === 'rejected') console.error('연동 재전송 중 에러:', settled.reason);
  });
  return tallySendResults(results);
};
