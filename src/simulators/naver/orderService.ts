import type { NaverRepository } from './repository';
import type {
  InvalidInput,
  NaverDispatchItem,
  NaverOrderBatchResult,
  NaverOrderFailCode,
  NaverOrderFailInfo,
  NaverProductOrderCursor,
  NaverProductOrderListResponse,
  NaverProductOrderResponse,
  NaverSeller,
  NaverStoredProductOrder,
  SimulatorResult,
} from './types';
import { isKnownDeliveryCompany } from './deliveryCompanies';
import { buildOrderDrafts, countOrdersToGenerate, createOrderNumber, type Random } from './orderGeneration';

export const PRODUCT_ORDER_PAGE_SIZE = 50;

export interface ProductOrderQuery {
  from: Date;
  /** null이면 상한 없음. 기본값을 now로 두면 같은 요청에서 방금 만든 주문이 `< now`에 걸려 빠진다. */
  to: Date | null;
  /** null이면 첫 페이지. 다음 페이지는 앞 응답의 nextCursor를 그대로 받는다. */
  cursor: NaverProductOrderCursor | null;
}

const CURSOR_PATTERN = /^(\d+)\|(.+)$/;

/** 호출자에게는 불투명한 문자열이다. 안은 "변경 시각(ms)|상품주문번호"를 base64url로 감싼 것. */
export const encodeCursor = (cursor: NaverProductOrderCursor): string =>
  Buffer.from(`${cursor.lastChangedAt.getTime()}|${cursor.productOrderId}`).toString('base64url');

const decodeCursor = (value: string): NaverProductOrderCursor | null => {
  const match = CURSOR_PATTERN.exec(Buffer.from(value, 'base64url').toString('utf8'));
  if (!match) return null;
  const lastChangedAt = new Date(Number(match[1]));
  return Number.isNaN(lastChangedAt.getTime()) ? null : { lastChangedAt, productOrderId: match[2] };
};

const invalid = <T>(name: string, type: InvalidInput['type'], message: string): SimulatorResult<T> => ({
  ok: false,
  reason: 'INVALID',
  invalidInputs: [{ name, type, message }],
});

const parseTime = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseProductOrderQuery = (params: {
  lastChangedFrom: string | null;
  lastChangedTo: string | null;
  cursor: string | null;
}): SimulatorResult<ProductOrderQuery> => {
  if (params.lastChangedFrom === null || params.lastChangedFrom === '') {
    return invalid('lastChangedFrom', 'REQUIRED', 'lastChangedFrom은 필수입니다.');
  }
  const from = parseTime(params.lastChangedFrom);
  if (!from) return invalid('lastChangedFrom', 'TYPE', 'lastChangedFrom은 ISO 8601 시각이어야 합니다.');

  let to: Date | null = null;
  if (params.lastChangedTo !== null) {
    to = params.lastChangedTo === '' ? null : parseTime(params.lastChangedTo);
    if (!to) return invalid('lastChangedTo', 'TYPE', 'lastChangedTo는 ISO 8601 시각이어야 합니다.');
    if (to.getTime() < from.getTime()) {
      return invalid('lastChangedTo', 'RANGE', 'lastChangedTo는 lastChangedFrom보다 앞일 수 없습니다.');
    }
  }

  let cursor: NaverProductOrderCursor | null = null;
  if (params.cursor !== null) {
    cursor = decodeCursor(params.cursor);
    if (!cursor) return invalid('cursor', 'TYPE', 'cursor는 앞 응답의 nextCursor 값이어야 합니다.');
  }

  return { ok: true, data: { from, to, cursor } };
};

/**
 * 그사이 구매자가 넣은 주문을 만든다. 생성 시각을 읽은 값 그대로일 때만 선점해(claimOrderGeneration)
 * 같은 판매자의 동시 조회가 둘 다 만들지 않는다. 판매중 상품이 없으면 선점하지 않는다 — 상품이 생기면 바로 주문이 들어온다.
 */
export const generateOrders = async (
  repository: NaverRepository,
  sellerId: string,
  now: Date,
  random: Random,
): Promise<void> => {
  const generatedAt = await repository.findOrdersGeneratedAt(sellerId);
  if (countOrdersToGenerate(generatedAt, now) === 0) return;

  const products = await repository.listSaleProducts(sellerId);
  if (products.length === 0) return;

  if (!(await repository.claimOrderGeneration(sellerId, generatedAt, now))) return;

  for (const draft of buildOrderDrafts(products, generatedAt, now, random)) {
    // 번호가 겹치면 1회만 다시 만든다. 그래도 겹치면 그 건을 건너뛴다(16자리 중 8자리 무작위라 드물다).
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const inserted = await repository.insertProductOrder({
        productOrderId: createOrderNumber(now, random),
        orderId: createOrderNumber(now, random),
        sellerId,
        productNo: draft.productNo,
        productOrderStatus: 'PAYED',
        placeOrderStatus: 'NOT_YET',
        paymentDate: draft.paymentDate,
        createdAt: now,
        // 결제일이 아니라 지금이다 — 과거 결제일로 두면 수집기가 이미 지나간 구간에 들어가 놓친다.
        lastChangedAt: now,
        deliveryCompany: null,
        trackingNumber: null,
        dispatchedAt: null,
        payload: draft.payload,
      });
      if (inserted) break;
    }
  }
};

export const toProductOrderResponse = (order: NaverStoredProductOrder): NaverProductOrderResponse => ({
  productOrderId: order.productOrderId,
  orderId: order.orderId,
  productOrderStatus: order.productOrderStatus,
  placeOrderStatus: order.placeOrderStatus,
  paymentDate: order.paymentDate.toISOString(),
  lastChangedDate: order.lastChangedAt.toISOString(),
  productNo: order.productNo,
  productName: order.payload.productName,
  optionValues: order.payload.optionValues,
  quantity: order.payload.quantity,
  unitPrice: order.payload.unitPrice,
  totalPaymentAmount: order.payload.totalPaymentAmount,
  deliveryFeeType: order.payload.deliveryFeeType,
  deliveryFeeAmount: order.payload.deliveryFeeAmount,
  orderer: order.payload.orderer,
  shippingAddress: order.payload.shippingAddress,
  shippingMemo: order.payload.shippingMemo,
  delivery:
    order.deliveryCompany && order.trackingNumber && order.dispatchedAt
      ? {
          deliveryCompany: order.deliveryCompany,
          trackingNumber: order.trackingNumber,
          dispatchedDate: order.dispatchedAt.toISOString(),
        }
      : null,
  claim: null,
});

/**
 * 커서 없는 첫 요청에서만 생성한다 — 한 번의 수집(첫 페이지~마지막 페이지)에 생성은 한 번이다.
 * 페이지는 커서로 넘긴다. 읽은 뒤 상태가 바뀐 주문은 변경 시각이 늘어 뒤에서 다시 나올 뿐이고(번호로 중복 제거),
 * 아직 읽지 않은 주문은 앞으로 당겨지지 않는다 — offset이었다면 그 자리만큼 빠졌다.
 */
export const listChangedProductOrders = async (
  repository: NaverRepository,
  seller: NaverSeller,
  query: ProductOrderQuery,
  now: Date,
  random: Random,
): Promise<NaverProductOrderListResponse> => {
  if (query.cursor === null) await generateOrders(repository, seller.id, now, random);

  const rows = await repository.listProductOrders({
    sellerId: seller.id,
    from: query.from,
    to: query.to,
    after: query.cursor,
    limit: PRODUCT_ORDER_PAGE_SIZE + 1,
  });
  const page = rows.slice(0, PRODUCT_ORDER_PAGE_SIZE);
  const last = page[page.length - 1];

  return {
    productOrders: page.map(toProductOrderResponse),
    nextCursor:
      rows.length > PRODUCT_ORDER_PAGE_SIZE
        ? encodeCursor({ lastChangedAt: last.lastChangedAt, productOrderId: last.productOrderId })
        : null,
  };
};

export const PRODUCT_ORDER_REQUEST_MAX = 50;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 요청 전체를 400으로 막는 모양 검사. 건별 사유(없는 주문·상태)는 서비스가 판정한다. */
const parseList = (body: unknown, field: string): SimulatorResult<unknown[]> => {
  const value = isRecord(body) ? body[field] : undefined;
  if (value === undefined) return invalid(field, 'REQUIRED', `${field}는 필수입니다.`);
  if (!Array.isArray(value)) return invalid(field, 'TYPE', `${field}는 배열이어야 합니다.`);
  if (value.length === 0) return invalid(field, 'RANGE', `${field}는 1건 이상이어야 합니다.`);
  if (value.length > PRODUCT_ORDER_REQUEST_MAX) {
    return invalid(field, 'RANGE', `${field}는 한 번에 최대 ${PRODUCT_ORDER_REQUEST_MAX}건입니다.`);
  }
  return { ok: true, data: value };
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export const parseConfirmRequest = (body: unknown): SimulatorResult<string[]> => {
  const list = parseList(body, 'productOrderIds');
  if (!list.ok) return list;
  if (!list.data.every(isNonEmptyString)) {
    return invalid('productOrderIds', 'TYPE', '상품주문번호는 빈 값이 아닌 문자열이어야 합니다.');
  }
  return { ok: true, data: [...new Set(list.data as string[])] };
};

export const parseDispatchRequest = (body: unknown): SimulatorResult<NaverDispatchItem[]> => {
  const list = parseList(body, 'dispatchProductOrders');
  if (!list.ok) return list;

  const items = new Map<string, NaverDispatchItem>();
  for (const element of list.data) {
    if (
      !isRecord(element) ||
      !isNonEmptyString(element.productOrderId) ||
      typeof element.deliveryCompanyCode !== 'string' ||
      typeof element.trackingNumber !== 'string'
    ) {
      return invalid(
        'dispatchProductOrders',
        'TYPE',
        '각 항목은 productOrderId·deliveryCompanyCode·trackingNumber 문자열을 가져야 합니다.',
      );
    }
    // 같은 번호가 두 번 오면 첫 건만 처리한다.
    if (!items.has(element.productOrderId)) {
      items.set(element.productOrderId, {
        productOrderId: element.productOrderId,
        deliveryCompanyCode: element.deliveryCompanyCode,
        trackingNumber: element.trackingNumber,
      });
    }
  }
  return { ok: true, data: [...items.values()] };
};

const FAIL_MESSAGES: Record<NaverOrderFailCode, string> = {
  NOT_FOUND: '상품주문이 존재하지 않습니다.',
  INVALID_STATUS: '처리할 수 없는 주문 상태입니다.',
  NOT_CONFIRMED: '발주확인되지 않은 주문입니다.',
  INVALID_INPUT: '택배사 또는 송장번호가 올바르지 않습니다.',
};

const fail = (productOrderId: string, code: NaverOrderFailCode): NaverOrderFailInfo => ({
  productOrderId,
  code,
  message: FAIL_MESSAGES[code],
});

/** 결과를 요청 순서대로 모은다. code가 null이면 성공. */
const toBatchResult = (ids: string[], outcome: Map<string, NaverOrderFailCode | null>): NaverOrderBatchResult => {
  const result: NaverOrderBatchResult = { successProductOrderIds: [], failProductOrderInfos: [] };
  for (const id of ids) {
    const code = outcome.get(id) ?? null;
    if (code) result.failProductOrderInfos.push(fail(id, code));
    else result.successProductOrderIds.push(id);
  }
  return result;
};

const byId = (orders: NaverStoredProductOrder[]) => new Map(orders.map((order) => [order.productOrderId, order]));

/** 발주확인 판정. 남의 주문과 없는 주문은 같은 NOT_FOUND다 — 존재 여부를 다른 판매자에게 알리지 않는다. */
const confirmFailCode = (order: NaverStoredProductOrder | undefined): NaverOrderFailCode | null => {
  if (!order) return 'NOT_FOUND';
  if (order.productOrderStatus !== 'PAYED') return 'INVALID_STATUS';
  return null;
};

/** 이미 OK인 주문은 성공으로 세되 쓰지 않는다(멱등). */
export const confirmProductOrders = async (
  repository: NaverRepository,
  seller: NaverSeller,
  productOrderIds: string[],
  now: Date,
): Promise<NaverOrderBatchResult> => {
  const before = byId(await repository.findProductOrders(seller.id, productOrderIds));
  const targets = productOrderIds.filter((id) => {
    const order = before.get(id);
    return confirmFailCode(order) === null && order?.placeOrderStatus === 'NOT_YET';
  });
  const updated = new Set(await repository.confirmProductOrders(seller.id, targets, now));

  // UPDATE에 걸리지 않은 대상은 확인과 쓰기 사이 다른 요청이 바꾼 것이다 — 다시 읽어 사유를 정한다.
  const missed = targets.filter((id) => !updated.has(id));
  const after = byId(await repository.findProductOrders(seller.id, missed));

  const outcome = new Map<string, NaverOrderFailCode | null>();
  for (const id of productOrderIds) {
    if (updated.has(id)) {
      outcome.set(id, null);
      continue;
    }
    const current = missed.includes(id) ? after.get(id) : before.get(id);
    const code = confirmFailCode(current);
    outcome.set(id, code ?? (current?.placeOrderStatus === 'OK' ? null : 'INVALID_STATUS'));
  }
  return toBatchResult(productOrderIds, outcome);
};

/** 발송처리 판정(입력 검사 뒤). 송장 수정은 범위 밖이라 이미 배송중이면 INVALID_STATUS다. */
const dispatchFailCode = (order: NaverStoredProductOrder | undefined): NaverOrderFailCode | null => {
  if (!order) return 'NOT_FOUND';
  if (order.placeOrderStatus !== 'OK') return 'NOT_CONFIRMED';
  if (order.productOrderStatus !== 'PAYED') return 'INVALID_STATUS';
  return null;
};

/**
 * 이미 같은 송장으로 발송처리된 주문 — 응답을 못 받은 호출자의 재시도다. 성공으로 세되 쓰지 않는다(발주확인과 같은 멱등).
 * 송장이 다르면 수정이라 여전히 INVALID_STATUS다. 비교하는 송장번호는 trim된 값이다.
 */
const isSameDispatch = (order: NaverStoredProductOrder | undefined, item: NaverDispatchItem): boolean =>
  order?.productOrderStatus === 'DELIVERING' &&
  order.deliveryCompany === item.deliveryCompanyCode &&
  order.trackingNumber === item.trackingNumber;

export const dispatchProductOrders = async (
  repository: NaverRepository,
  seller: NaverSeller,
  items: NaverDispatchItem[],
  now: Date,
): Promise<NaverOrderBatchResult> => {
  const outcome = new Map<string, NaverOrderFailCode | null>();
  const valid: NaverDispatchItem[] = [];
  for (const item of items) {
    const trackingNumber = item.trackingNumber.trim();
    if (!isKnownDeliveryCompany(item.deliveryCompanyCode) || trackingNumber === '') {
      outcome.set(item.productOrderId, 'INVALID_INPUT');
    } else {
      valid.push({ ...item, trackingNumber });
    }
  }

  const before = byId(
    await repository.findProductOrders(
      seller.id,
      valid.map((item) => item.productOrderId),
    ),
  );

  await Promise.all(
    valid.map(async (item) => {
      const order = before.get(item.productOrderId);
      if (isSameDispatch(order, item)) {
        outcome.set(item.productOrderId, null);
        return;
      }
      const precheck = dispatchFailCode(order);
      if (precheck) {
        outcome.set(item.productOrderId, precheck);
        return;
      }
      if (await repository.dispatchProductOrder(seller.id, item, now)) {
        outcome.set(item.productOrderId, null);
        return;
      }
      // 확인과 쓰기 사이 다른 요청이 바꿨다 — 다시 읽어 사유를 정한다.
      const [current] = await repository.findProductOrders(seller.id, [item.productOrderId]);
      outcome.set(
        item.productOrderId,
        isSameDispatch(current, item) ? null : (dispatchFailCode(current) ?? 'INVALID_STATUS'),
      );
    }),
  );

  return toBatchResult(
    items.map((item) => item.productOrderId),
    outcome,
  );
};
