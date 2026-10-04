import 'server-only';
import { randomUUID } from 'crypto';
import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts, orderCollections, orders, shoppingAccounts } from '@/db/schema';
import { toKstDateRange, toKstDateTime } from '@/shared/utils/date';
import { ShoppingMalls } from '@/types/common.type';
import { foldNaverError, MALL_NO_RESPONSE_MESSAGE } from '@/features/mallLinkedProduct/util/foldNaverError';
import { MALL_ACCOUNT_MISSING_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';
import { CollectionAccountFilters, CollectionAccountResult, CollectionAccountRow } from '../types/collection.types';
import { collectPagedOrders, CollectOutcome, insertGeneratedOrders, PageFetch } from '../util/collectAccountOrders';
import {
  CollectingAccount,
  naverProductOrderPageSchema,
  OrderInsert,
  toOrderFromNaver,
} from '../util/naverOrderTranslate';
import { escapeLikePattern } from '@/shared/utils/likePattern';
import { buildRandomOrders, RandomOrderSource, toRandomOrderSource } from '../util/randomOrderGeneration';
import { OrderActor } from './orderStore';

export const COLLECTION_ACCOUNT_UNAVAILABLE_MESSAGE = '수집할 수 없는 계정입니다.';
export const COLLECTION_UNEXPECTED_ERROR_MESSAGE = '주문 수집 중 오류가 발생했습니다.';
export const NAVER_RESPONSE_SHAPE_MESSAGE = '외부 쇼핑몰 응답 형식이 올바르지 않습니다.';

const SIMULATOR_TIMEOUT_MS = 10_000;

const newOrderNumber = () => `ord_${randomUUID()}`;

/**
 * 수집자 검색(유형은 수집자 하나). 이름 또는 이메일 부분일치 — 화면에 이름이 보이고 이메일은 title이라 어느 쪽으로도 찾게 한다.
 * LEFT JOIN 결과에 거는 조건이라 수집한 적 없는 계정(수집자 null)은 검색어가 있으면 빠진다.
 */
const collectedBySearch = (searchValue: string) => {
  const keyword = searchValue.trim();
  if (!keyword) return undefined;
  const pattern = `%${escapeLikePattern(keyword)}%`;
  return or(ilike(orderCollections.collectedByName, pattern), ilike(orderCollections.collectedByEmail, pattern));
};

/** 사용 중인 계정 + 마지막 수집 결과. 행이 없으면 WAITING. */
export const listCollectionAccounts = async (
  ownerId: string,
  filters: CollectionAccountFilters,
): Promise<CollectionAccountRow[]> => {
  const rows = await db
    .select({ account: shoppingAccounts, collection: orderCollections })
    .from(shoppingAccounts)
    .leftJoin(orderCollections, eq(orderCollections.shoppingAccountId, shoppingAccounts.id))
    .where(
      and(
        eq(shoppingAccounts.ownerId, ownerId),
        eq(shoppingAccounts.isActive, true),
        filters.mallCode === 'ALL' ? undefined : eq(shoppingAccounts.mallCode, filters.mallCode),
        filters.mallId === 'ALL' ? undefined : eq(shoppingAccounts.mallId, filters.mallId),
        collectedBySearch(filters.searchValue),
      ),
    )
    .orderBy(asc(shoppingAccounts.mallCode), asc(shoppingAccounts.mallId));

  return rows.map(({ account, collection }) => ({
    accountId: account.id,
    mallCode: account.mallCode as ShoppingMalls,
    mallId: account.mallId,
    status: collection?.status ?? 'WAITING',
    periodStart: collection?.periodStart ?? null,
    periodEnd: collection?.periodEnd ?? null,
    newCount: collection?.newCount ?? null,
    duplicateCount: collection?.duplicateCount ?? null,
    errorMessage: collection?.errorMessage ?? null,
    collectedAt: collection ? toKstDateTime(collection.collectedAt) : null,
    collectedByName: collection?.collectedByName ?? null,
    collectedByEmail: collection?.collectedByEmail ?? null,
  }));
};

/** 같은 몰·쇼핑몰주문번호가 있으면 건너뛴다(스펙 결정 5). 들어간 행 수를 돌려준다. */
const insertOrders = async (rows: OrderInsert[]): Promise<number> => {
  const inserted = await db
    .insert(orders)
    .values(rows)
    .onConflictDoNothing({
      target: [orders.ownerId, orders.mallCode, orders.shopOrderNumber],
      where: sql`${orders.shopOrderNumber} <> ''`,
    })
    .returning({ orderNumber: orders.orderNumber });
  return inserted.length;
};

/** 시뮬레이터는 HTTP로만 부른다 — src/simulators를 import하면 네트워크 경계가 사라진다. */
const fetchNaverPage = async (
  apiKey: string,
  period: { start: Date; endExclusive: Date },
  cursor: string | null,
): Promise<PageFetch> => {
  const params = new URLSearchParams({
    lastChangedFrom: period.start.toISOString(),
    lastChangedTo: period.endExclusive.toISOString(),
  });
  if (cursor) params.set('cursor', cursor);
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/external/naver/product-orders?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(SIMULATOR_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) return { ok: false, message: foldNaverError(response.status, body) };
    const parsed = naverProductOrderPageSchema.safeParse(body);
    return parsed.success ? { ok: true, page: parsed.data } : { ok: false, message: NAVER_RESPONSE_SHAPE_MESSAGE };
  } catch (error) {
    console.error('네이버 시뮬레이터 주문 조회 실패:', error);
    return { ok: false, message: MALL_NO_RESPONSE_MESSAGE };
  }
};

const collectNaver = (account: CollectingAccount, period: { start: Date; endExclusive: Date }, now: Date) => {
  if (!account.apiKey) {
    return Promise.resolve<CollectOutcome>({
      status: 'FAILED',
      newCount: 0,
      duplicateCount: 0,
      errorMessage: MALL_ACCOUNT_MISSING_MESSAGE,
    });
  }
  return collectPagedOrders({
    fetchPage: (cursor) => fetchNaverPage(account.apiKey, period, cursor),
    translate: (productOrder) => toOrderFromNaver(productOrder, account, newOrderNumber(), now),
    insertOrders,
  });
};

/** 연동 성공·판매중인 연동 건의 스냅샷(몰에 실제로 올라간 값)이 재료다. */
const loadRandomSources = async (account: CollectingAccount): Promise<RandomOrderSource[]> => {
  const rows = await db
    .select({ product: mallLinkedProducts.productSnapshot, externalProductId: mallLinkedProducts.externalProductId })
    .from(mallLinkedProducts)
    .where(
      and(
        eq(mallLinkedProducts.ownerId, account.ownerId),
        eq(mallLinkedProducts.mallAccountId, account.id),
        eq(mallLinkedProducts.status, 'success'),
        eq(mallLinkedProducts.productState, 'ON_SALE'),
      ),
    );
  return rows.flatMap(({ product, externalProductId }) => {
    const source = toRandomOrderSource(product, externalProductId);
    return source ? [source] : [];
  });
};

const collectRandom = async (
  account: CollectingAccount,
  period: { start: Date; endExclusive: Date },
  now: Date,
  random: () => number,
): Promise<{ outcome: CollectOutcome; generated: boolean }> => {
  const [existing] = await db
    .select({ generatedAt: orderCollections.generatedAt })
    .from(orderCollections)
    .where(eq(orderCollections.shoppingAccountId, account.id))
    .limit(1);
  const generated = buildRandomOrders({
    sources: await loadRandomSources(account),
    account,
    generatedAt: existing?.generatedAt ?? null,
    period,
    now,
    random,
    newOrderNumber,
  });
  return { outcome: await insertGeneratedOrders(generated, insertOrders), generated: generated.length > 0 };
};

const saveCollectionResult = async (input: {
  account: CollectingAccount;
  outcome: CollectOutcome;
  startDate: string;
  endDate: string;
  actor: OrderActor;
  now: Date;
  generated: boolean;
}) => {
  const { account, outcome, startDate, endDate, actor, now, generated } = input;
  const values = {
    status: outcome.status,
    periodStart: startDate,
    periodEnd: endDate,
    newCount: outcome.newCount,
    duplicateCount: outcome.duplicateCount,
    errorMessage: outcome.errorMessage,
    collectedAt: now,
    collectedByName: actor.name,
    collectedByEmail: actor.email,
    // 만든 주문이 있을 때만 생성 기준 시각을 옮긴다 — 연동상품이 없거나 기간이 안 겹치면 다음 수집에 바로 생기게.
    ...(generated ? { generatedAt: now } : {}),
  };
  await db
    .insert(orderCollections)
    .values({ shoppingAccountId: account.id, ownerId: account.ownerId, ...values })
    .onConflictDoUpdate({ target: orderCollections.shoppingAccountId, set: values });
};

/** 계정마다 차례로(병렬 아님 — 시뮬레이터·DB 부하를 예측 가능하게) 수집하고 결과를 요청 순서로 돌려준다. */
export const runCollection = async (input: {
  actor: OrderActor;
  accountIds: string[];
  startDate: string;
  endDate: string;
  now: Date;
  random: () => number;
}): Promise<CollectionAccountResult[]> => {
  const { actor, accountIds, startDate, endDate, now, random } = input;
  const period = toKstDateRange(startDate, endDate);

  const accounts = await db
    .select({
      id: shoppingAccounts.id,
      ownerId: shoppingAccounts.ownerId,
      mallCode: shoppingAccounts.mallCode,
      mallId: shoppingAccounts.mallId,
      apiKey: shoppingAccounts.apiKey,
    })
    .from(shoppingAccounts)
    .where(
      and(
        eq(shoppingAccounts.ownerId, actor.ownerId),
        eq(shoppingAccounts.isActive, true),
        inArray(shoppingAccounts.id, accountIds),
      ),
    );
  const byId = new Map(accounts.map((row) => [row.id, { ...row, mallCode: row.mallCode as ShoppingMalls }]));

  const results: CollectionAccountResult[] = [];
  for (const accountId of accountIds) {
    const account = byId.get(accountId);
    // 남의 것·없는 것·사용 안 함을 구분하지 않는다 — 존재 여부를 드러내지 않는다. 기록도 남기지 않는다.
    if (!account) {
      results.push({
        accountId,
        status: 'FAILED',
        newCount: 0,
        duplicateCount: 0,
        errorMessage: COLLECTION_ACCOUNT_UNAVAILABLE_MESSAGE,
      });
      continue;
    }

    let outcome: CollectOutcome;
    let generated = false;
    try {
      if (account.mallCode === 'NSST') {
        outcome = await collectNaver(account, period, now);
      } else {
        ({ outcome, generated } = await collectRandom(account, period, now, random));
      }
    } catch (error) {
      console.error('주문 수집 중 에러:', error);
      outcome = { status: 'FAILED', newCount: 0, duplicateCount: 0, errorMessage: COLLECTION_UNEXPECTED_ERROR_MESSAGE };
    }

    try {
      await saveCollectionResult({ account, outcome, startDate, endDate, actor, now, generated });
    } catch (error) {
      // 결과 기록만 실패해도 주문은 이미 들어갔다 — 응답은 실제 수집 결과를 따른다(연동 전송 이력과 같은 원칙).
      console.error('수집 결과 저장 실패:', error);
    }
    results.push({ accountId, ...outcome });
  }
  return results;
};
