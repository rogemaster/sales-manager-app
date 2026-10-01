import { describe, expect, it } from 'vitest';
import { createFakeRepository } from './fakeRepository';
import type { Random } from './orderGeneration';
import {
  confirmProductOrders,
  dispatchProductOrders,
  encodeCursor,
  listChangedProductOrders,
  parseConfirmRequest,
  parseDispatchRequest,
  parseProductOrderQuery,
  PRODUCT_ORDER_PAGE_SIZE,
  PRODUCT_ORDER_REQUEST_MAX,
  type ProductOrderQuery,
} from './orderService';
import type { NaverProductRequest, NaverSeller, NaverStoredProduct, NaverStoredProductOrder } from './types';

const SELLER: NaverSeller = { id: 'seller_1', apiKey: 'key-1', name: '판매자1' };
const OTHER_SELLER: NaverSeller = { id: 'seller_2', apiKey: 'key-2', name: '판매자2' };
const NOW = new Date('2026-10-01T03:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

/** 호출마다 값이 바뀌는 난수 — 생성되는 주문번호가 서로 다르다. */
const stepRandom = (): Random => {
  let i = 0;
  return () => {
    i += 1;
    return (i * 0.137) % 1;
  };
};
const fixed =
  (value: number): Random =>
  () =>
    value;

const PAYLOAD: NaverProductRequest = {
  name: '테스트 상품',
  statusType: 'SALE',
  leafCategoryId: 'CAT_1',
  detailContent: '<p>상세</p>',
  images: { representativeImage: { url: 'https://cdn.example.com/a.png' } },
  salePrice: 10000,
  stockQuantity: 5,
  deliveryInfo: {
    deliveryFeeType: 'PAID',
    baseFee: 3000,
    deliveryCompany: 'CJ',
    shippingAddressId: 'ADDR_S1',
    returnAddressId: 'ADDR_R1',
  },
  brandName: '브랜드',
  manufacturerName: '제조사',
  productInfoProvidedNotice: { type: 'ETC' },
};

const product = (productNo: number, sellerId: string, statusType: NaverStoredProduct['statusType'] = 'SALE') => ({
  productNo,
  sellerId,
  name: `상품${productNo}`,
  statusType,
  payload: { ...PAYLOAD, statusType },
});

const storedOrder = (
  productOrderId: string,
  overrides: Partial<NaverStoredProductOrder> = {},
): NaverStoredProductOrder => ({
  productOrderId,
  orderId: `O${productOrderId}`,
  sellerId: SELLER.id,
  productNo: 1,
  productOrderStatus: 'PAYED',
  placeOrderStatus: 'NOT_YET',
  paymentDate: minutesAgo(120),
  createdAt: minutesAgo(90),
  lastChangedAt: minutesAgo(60),
  deliveryCompany: null,
  trackingNumber: null,
  dispatchedAt: null,
  payload: {
    productName: '상품1',
    optionValues: null,
    quantity: 1,
    unitPrice: 10000,
    totalPaymentAmount: 13000,
    deliveryFeeType: 'PAID',
    deliveryFeeAmount: 3000,
    orderer: { name: '김민준', tel: '010-0000-0000' },
    shippingAddress: {
      name: '김민준',
      tel: '010-0000-0000',
      zipCode: '06236',
      baseAddress: '서울',
      detailAddress: '1층',
    },
    shippingMemo: null,
  },
  ...overrides,
});

const query = (overrides: Partial<ProductOrderQuery> = {}): ProductOrderQuery => ({
  from: minutesAgo(24 * 60),
  to: null,
  cursor: null,
  ...overrides,
});

/** 16자리 고정 길이 번호 — 같은 변경 시각이면 번호 순으로 정렬된다. */
const orderNo = (i: number) => `1000000000000${String(i).padStart(3, '0')}`;
const ids = (result: { productOrders: { productOrderId: string }[] }) =>
  result.productOrders.map((o) => o.productOrderId);

describe('parseProductOrderQuery', () => {
  const params = (overrides: Partial<Record<'lastChangedFrom' | 'lastChangedTo' | 'cursor', string | null>> = {}) => ({
    lastChangedFrom: '2026-10-01T00:00:00.000Z',
    lastChangedTo: null,
    cursor: null,
    ...overrides,
  });

  it('From만 있으면 To·커서는 null이다(상한 없음, 처음부터)', () => {
    const result = parseProductOrderQuery(params());
    expect(result).toEqual({
      ok: true,
      data: { from: new Date('2026-10-01T00:00:00.000Z'), to: null, cursor: null },
    });
  });

  it('From이 없으면 REQUIRED, 해석할 수 없으면 TYPE', () => {
    const missing = parseProductOrderQuery(params({ lastChangedFrom: null }));
    expect(missing.ok === false && missing.invalidInputs[0]).toMatchObject({
      name: 'lastChangedFrom',
      type: 'REQUIRED',
    });
    const broken = parseProductOrderQuery(params({ lastChangedFrom: 'not-a-date' }));
    expect(broken.ok === false && broken.invalidInputs[0]).toMatchObject({ name: 'lastChangedFrom', type: 'TYPE' });
  });

  it('To가 From보다 앞이면 RANGE, 같으면 통과한다', () => {
    const before = parseProductOrderQuery(params({ lastChangedTo: '2026-09-30T23:59:59.000Z' }));
    expect(before.ok === false && before.invalidInputs[0]).toMatchObject({ name: 'lastChangedTo', type: 'RANGE' });
    expect(parseProductOrderQuery(params({ lastChangedTo: '2026-10-01T00:00:00.000Z' })).ok).toBe(true);
  });

  it('To가 빈 문자열이거나 해석할 수 없으면 TYPE', () => {
    const empty = parseProductOrderQuery(params({ lastChangedTo: '' }));
    expect(empty.ok === false && empty.invalidInputs[0]).toMatchObject({ name: 'lastChangedTo', type: 'TYPE' });
  });

  it('커서는 받은 값을 그대로 돌려주면 해석된다', () => {
    const cursor = { lastChangedAt: new Date('2026-10-01T01:02:03.456Z'), productOrderId: orderNo(7) };
    expect(parseProductOrderQuery(params({ cursor: encodeCursor(cursor) }))).toMatchObject({
      ok: true,
      data: { cursor },
    });
  });

  it('해석할 수 없는 커서는 TYPE', () => {
    for (const cursor of ['', 'abc', encodeCursor({ lastChangedAt: new Date(NaN), productOrderId: 'x' })]) {
      const result = parseProductOrderQuery(params({ cursor }));
      expect(result.ok === false && result.invalidInputs[0]).toMatchObject({ name: 'cursor', type: 'TYPE' });
    }
  });
});

describe('listChangedProductOrders — 생성', () => {
  it('처음 조회하면 5건을 만들고, To 생략 시 방금 만든 주문이 보인다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER], products: [product(1, SELLER.id)] });
    const result = await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(repository.productOrders.size).toBe(5);
    expect(result.productOrders).toHaveLength(5);
    expect(result.productOrders[0]).toMatchObject({
      productOrderStatus: 'PAYED',
      placeOrderStatus: 'NOT_YET',
      lastChangedDate: NOW.toISOString(),
      productNo: 1,
      delivery: null,
      claim: null,
    });
    expect(await repository.findOrdersGeneratedAt(SELLER.id)).toEqual(NOW);
    // 생성일은 결제일(무작위 과거)과 다르고, 이후 상태 변경으로 덮어써지지 않는다.
    expect([...repository.productOrders.values()].every((order) => order.createdAt?.getTime() === NOW.getTime())).toBe(
      true,
    );
  });

  it('SALE 상품이 없으면 만들지 않고 생성 시각도 그대로다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER], products: [product(1, SELLER.id, 'WAIT')] });
    await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(repository.productOrders.size).toBe(0);
    expect(await repository.findOrdersGeneratedAt(SELLER.id)).toBeNull();
  });

  it('다른 판매자의 상품으로는 만들지 않는다', async () => {
    const repository = createFakeRepository({
      sellers: [SELLER, OTHER_SELLER],
      products: [product(1, OTHER_SELLER.id)],
    });
    await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(repository.productOrders.size).toBe(0);
  });

  it('커서가 있는 요청(다음 페이지)은 만들지 않는다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER], products: [product(1, SELLER.id)] });
    const cursor = { lastChangedAt: minutesAgo(1), productOrderId: orderNo(0) };
    await listChangedProductOrders(repository, SELLER, query({ cursor }), NOW, stepRandom());
    expect(repository.productOrders.size).toBe(0);
  });

  it('30분이 안 지났으면 만들지 않는다', async () => {
    const repository = createFakeRepository({
      sellers: [SELLER],
      products: [product(1, SELLER.id)],
      ordersGeneratedAt: { [SELLER.id]: minutesAgo(10) },
    });
    await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(repository.productOrders.size).toBe(0);
  });

  it('선점에 실패하면(동시 요청이 먼저 만듦) 만들지 않는다', async () => {
    const base = createFakeRepository({ sellers: [SELLER], products: [product(1, SELLER.id)] });
    const repository = { ...base, claimOrderGeneration: async () => false };
    await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(base.productOrders.size).toBe(0);
  });

  it('번호가 겹치면 1회 다시 만들고, 그래도 겹치면 그 건을 건너뛴다', async () => {
    const repository = createFakeRepository({ sellers: [SELLER], products: [product(1, SELLER.id)] });
    // 고정 난수라 모든 번호가 같다 — 첫 건만 들어가고 나머지 4건은 재시도 후 건너뛴다.
    await listChangedProductOrders(repository, SELLER, query(), NOW, fixed(0));
    expect(repository.productOrders.size).toBe(1);
  });
});

describe('listChangedProductOrders — 조회', () => {
  const noGeneration = { [SELLER.id]: NOW };

  it('From 이상 To 미만(반개구간)이고 다른 판매자 주문은 안 보인다', async () => {
    const repository = createFakeRepository({
      sellers: [SELLER, OTHER_SELLER],
      ordersGeneratedAt: noGeneration,
      productOrders: [
        storedOrder('1000000000000001', { lastChangedAt: minutesAgo(60) }),
        storedOrder('1000000000000002', { lastChangedAt: minutesAgo(30) }),
        storedOrder('1000000000000003', { lastChangedAt: minutesAgo(30), sellerId: OTHER_SELLER.id }),
      ],
    });
    const result = await listChangedProductOrders(
      repository,
      SELLER,
      query({ from: minutesAgo(60), to: minutesAgo(30) }),
      NOW,
      stepRandom(),
    );
    expect(result.productOrders.map((o) => o.productOrderId)).toEqual(['1000000000000001']);
  });

  it('변경 시각, 같으면 번호 오름차순이고 다음이 있으면 커서를 준다', async () => {
    const orders = Array.from({ length: PRODUCT_ORDER_PAGE_SIZE + 1 }, (_, i) =>
      storedOrder(orderNo(i), { lastChangedAt: minutesAgo(60) }),
    );
    const repository = createFakeRepository({
      sellers: [SELLER],
      ordersGeneratedAt: noGeneration,
      productOrders: [...orders].reverse(),
    });
    const first = await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(first.productOrders).toHaveLength(PRODUCT_ORDER_PAGE_SIZE);
    expect(first.productOrders[0].productOrderId).toBe(orderNo(0));
    expect(first.nextCursor).toBe(encodeCursor({ lastChangedAt: minutesAgo(60), productOrderId: orderNo(49) }));
    const cursor = parseProductOrderQuery({
      lastChangedFrom: query().from.toISOString(),
      lastChangedTo: null,
      cursor: first.nextCursor,
    });
    const second = await listChangedProductOrders(
      repository,
      SELLER,
      query({ cursor: cursor.ok ? cursor.data.cursor : null }),
      NOW,
      stepRandom(),
    );
    expect(ids(second)).toEqual([orderNo(50)]);
    expect(second.nextCursor).toBeNull();
  });

  describe('페이지 사이에 상태가 바뀌어도 아직 읽지 않은 주문이 빠지지 않는다', () => {
    const COUNT = PRODUCT_ORDER_PAGE_SIZE + 3;
    const setup = () =>
      createFakeRepository({
        sellers: [SELLER],
        ordersGeneratedAt: noGeneration,
        productOrders: Array.from({ length: COUNT }, (_, i) =>
          storedOrder(orderNo(i), { lastChangedAt: minutesAgo(60) }),
        ),
      });
    const lastOf = (result: { productOrders: { productOrderId: string; lastChangedDate: string }[] }) => {
      const last = result.productOrders[result.productOrders.length - 1];
      return { lastChangedAt: new Date(last.lastChangedDate), productOrderId: last.productOrderId };
    };

    it('1페이지 주문 일부를 발주확인해 뒤로 옮겨도 다음 페이지가 나머지를 준다', async () => {
      const repository = setup();
      const first = await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
      await confirmProductOrders(repository, SELLER, [orderNo(0), orderNo(1), orderNo(2)], NOW);
      const second = await listChangedProductOrders(
        repository,
        SELLER,
        query({ cursor: lastOf(first) }),
        NOW,
        stepRandom(),
      );
      // offset 방식이면 50~52번이 앞으로 당겨져 빠졌다. 옮겨진 0~2번은 뒤에서 다시 받는다(번호로 중복 제거).
      expect(ids(second)).toEqual([orderNo(50), orderNo(51), orderNo(52), orderNo(0), orderNo(1), orderNo(2)]);
    });

    it('To를 지정해 바뀐 주문이 범위 밖으로 나가도 나머지를 준다', async () => {
      const repository = setup();
      const to = minutesAgo(30);
      const first = await listChangedProductOrders(repository, SELLER, query({ to }), NOW, stepRandom());
      await confirmProductOrders(repository, SELLER, [orderNo(0), orderNo(1), orderNo(2)], NOW);
      const second = await listChangedProductOrders(
        repository,
        SELLER,
        query({ to, cursor: lastOf(first) }),
        NOW,
        stepRandom(),
      );
      expect(ids(second)).toEqual([orderNo(50), orderNo(51), orderNo(52)]);
    });

    it('페이지 사이에 새 주문이 생기면 맨 뒤에서 받는다', async () => {
      const repository = setup();
      const first = await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
      await repository.insertProductOrder(storedOrder(orderNo(999), { lastChangedAt: NOW }));
      const second = await listChangedProductOrders(
        repository,
        SELLER,
        query({ cursor: lastOf(first) }),
        NOW,
        stepRandom(),
      );
      expect(ids(second)).toEqual([orderNo(50), orderNo(51), orderNo(52), orderNo(999)]);
    });
  });

  it('발송처리된 주문은 delivery를 채운다', async () => {
    const repository = createFakeRepository({
      sellers: [SELLER],
      ordersGeneratedAt: noGeneration,
      productOrders: [
        storedOrder('1000000000000001', {
          productOrderStatus: 'DELIVERING',
          placeOrderStatus: 'OK',
          deliveryCompany: 'CJ',
          trackingNumber: '123',
          dispatchedAt: minutesAgo(5),
          lastChangedAt: minutesAgo(5),
        }),
      ],
    });
    const result = await listChangedProductOrders(repository, SELLER, query(), NOW, stepRandom());
    expect(result.productOrders[0].delivery).toEqual({
      deliveryCompany: 'CJ',
      trackingNumber: '123',
      dispatchedDate: minutesAgo(5).toISOString(),
    });
  });
});

const failureType = (result: { ok: boolean; invalidInputs?: { type: string }[] }) =>
  result.ok === false ? result.invalidInputs?.[0]?.type : null;

describe('parseConfirmRequest', () => {
  it('배열이 없거나 배열이 아니면 400 사유를 준다', () => {
    expect(failureType(parseConfirmRequest({}))).toBe('REQUIRED');
    expect(failureType(parseConfirmRequest({ productOrderIds: 'x' }))).toBe('TYPE');
    expect(failureType(parseConfirmRequest(null))).toBe('REQUIRED');
  });

  it('0건이나 상한 초과는 RANGE', () => {
    expect(failureType(parseConfirmRequest({ productOrderIds: [] }))).toBe('RANGE');
    const tooMany = Array.from({ length: PRODUCT_ORDER_REQUEST_MAX + 1 }, (_, i) => String(i));
    expect(failureType(parseConfirmRequest({ productOrderIds: tooMany }))).toBe('RANGE');
  });

  it('문자열이 아닌 원소는 TYPE', () => {
    expect(failureType(parseConfirmRequest({ productOrderIds: ['a', 1] }))).toBe('TYPE');
    expect(failureType(parseConfirmRequest({ productOrderIds: [''] }))).toBe('TYPE');
  });

  it('중복 ID는 한 번만', () => {
    expect(parseConfirmRequest({ productOrderIds: ['a', 'b', 'a'] })).toEqual({ ok: true, data: ['a', 'b'] });
  });
});

describe('confirmProductOrders', () => {
  const seed = () =>
    createFakeRepository({
      sellers: [SELLER, OTHER_SELLER],
      productOrders: [
        storedOrder('P_NEW'),
        storedOrder('P_OK', { placeOrderStatus: 'OK' }),
        storedOrder('P_SHIPPED', { placeOrderStatus: 'OK', productOrderStatus: 'DELIVERING' }),
        storedOrder('P_OTHER', { sellerId: OTHER_SELLER.id }),
      ],
    });

  it('판정표대로 성공·실패를 나누고 요청 순서를 지킨다', async () => {
    const repository = seed();
    const result = await confirmProductOrders(
      repository,
      SELLER,
      ['P_SHIPPED', 'P_NEW', 'P_MISSING', 'P_OK', 'P_OTHER'],
      NOW,
    );
    expect(result.successProductOrderIds).toEqual(['P_NEW', 'P_OK']);
    expect(result.failProductOrderInfos.map(({ productOrderId, code }) => ({ productOrderId, code }))).toEqual([
      { productOrderId: 'P_SHIPPED', code: 'INVALID_STATUS' },
      { productOrderId: 'P_MISSING', code: 'NOT_FOUND' },
      { productOrderId: 'P_OTHER', code: 'NOT_FOUND' },
    ]);
  });

  it('NOT_YET은 OK가 되고 변경 시각이 갱신된다. 이미 OK인 건은 쓰지 않는다', async () => {
    const repository = seed();
    await confirmProductOrders(repository, SELLER, ['P_NEW', 'P_OK'], NOW);
    expect(repository.productOrders.get('P_NEW')).toMatchObject({ placeOrderStatus: 'OK', lastChangedAt: NOW });
    expect(repository.productOrders.get('P_OK')?.lastChangedAt).toEqual(minutesAgo(60));
  });

  it('UPDATE에 안 걸렸어도 다시 읽어 OK면 성공 — 다른 요청이 먼저 확인한 경우', async () => {
    const base = seed();
    const repository = {
      ...base,
      confirmProductOrders: async () => {
        const order = base.productOrders.get('P_NEW')!;
        base.productOrders.set('P_NEW', { ...order, placeOrderStatus: 'OK' as const });
        return [];
      },
    };
    const result = await confirmProductOrders(repository, SELLER, ['P_NEW'], NOW);
    expect(result).toEqual({ successProductOrderIds: ['P_NEW'], failProductOrderInfos: [] });
  });
});

describe('parseDispatchRequest', () => {
  const item = (overrides: Record<string, unknown> = {}) => ({
    productOrderId: 'P_1',
    deliveryCompanyCode: 'CJ',
    trackingNumber: '123',
    ...overrides,
  });

  it('배열이 없거나 0건·상한 초과면 400 사유', () => {
    expect(failureType(parseDispatchRequest({}))).toBe('REQUIRED');
    expect(failureType(parseDispatchRequest({ dispatchProductOrders: [] }))).toBe('RANGE');
    const tooMany = Array.from({ length: PRODUCT_ORDER_REQUEST_MAX + 1 }, (_, i) => item({ productOrderId: `P_${i}` }));
    expect(failureType(parseDispatchRequest({ dispatchProductOrders: tooMany }))).toBe('RANGE');
  });

  it('원소 모양이 틀리면 TYPE — 값이 비어 있는 것은 건별 판정으로 넘긴다', () => {
    expect(failureType(parseDispatchRequest({ dispatchProductOrders: ['P_1'] }))).toBe('TYPE');
    expect(failureType(parseDispatchRequest({ dispatchProductOrders: [item({ trackingNumber: 123 })] }))).toBe('TYPE');
    expect(failureType(parseDispatchRequest({ dispatchProductOrders: [item({ productOrderId: '' })] }))).toBe('TYPE');
    expect(parseDispatchRequest({ dispatchProductOrders: [item({ trackingNumber: '' })] }).ok).toBe(true);
  });

  it('같은 번호는 첫 건만', () => {
    const result = parseDispatchRequest({
      dispatchProductOrders: [item(), item({ trackingNumber: '999' })],
    });
    expect(result).toEqual({ ok: true, data: [item()] });
  });
});

describe('dispatchProductOrders', () => {
  const seed = () =>
    createFakeRepository({
      sellers: [SELLER, OTHER_SELLER],
      productOrders: [
        storedOrder('P_READY', { placeOrderStatus: 'OK' }),
        storedOrder('P_NEW'),
        storedOrder('P_SHIPPED', { placeOrderStatus: 'OK', productOrderStatus: 'DELIVERING' }),
        storedOrder('P_OTHER', { sellerId: OTHER_SELLER.id, placeOrderStatus: 'OK' }),
      ],
    });
  const item = (
    productOrderId: string,
    overrides: Partial<{ deliveryCompanyCode: string; trackingNumber: string }> = {},
  ) => ({
    productOrderId,
    deliveryCompanyCode: 'CJ',
    trackingNumber: '123',
    ...overrides,
  });

  it('판정표대로 성공·실패를 나누고 요청 순서를 지킨다', async () => {
    const result = await dispatchProductOrders(
      seed(),
      SELLER,
      [item('P_NEW'), item('P_READY'), item('P_SHIPPED'), item('P_OTHER'), item('P_MISSING')],
      NOW,
    );
    expect(result.successProductOrderIds).toEqual(['P_READY']);
    expect(result.failProductOrderInfos.map(({ productOrderId, code }) => ({ productOrderId, code }))).toEqual([
      { productOrderId: 'P_NEW', code: 'NOT_CONFIRMED' },
      { productOrderId: 'P_SHIPPED', code: 'INVALID_STATUS' },
      { productOrderId: 'P_OTHER', code: 'NOT_FOUND' },
      { productOrderId: 'P_MISSING', code: 'NOT_FOUND' },
    ]);
  });

  it('목록 밖 택배사는 INVALID_INPUT', async () => {
    const result = await dispatchProductOrders(seed(), SELLER, [item('P_READY', { deliveryCompanyCode: 'DHL' })], NOW);
    expect(result.failProductOrderInfos[0]).toMatchObject({ productOrderId: 'P_READY', code: 'INVALID_INPUT' });
  });

  it('공백만 있는 송장번호는 INVALID_INPUT', async () => {
    const result = await dispatchProductOrders(seed(), SELLER, [item('P_READY', { trackingNumber: '   ' })], NOW);
    expect(result.failProductOrderInfos[0]).toMatchObject({ productOrderId: 'P_READY', code: 'INVALID_INPUT' });
  });

  it('성공하면 배송중이 되고 송장번호는 trim해 저장한다', async () => {
    const repository = seed();
    await dispatchProductOrders(repository, SELLER, [item('P_READY', { trackingNumber: ' 123 ' })], NOW);
    expect(repository.productOrders.get('P_READY')).toMatchObject({
      productOrderStatus: 'DELIVERING',
      deliveryCompany: 'CJ',
      trackingNumber: '123',
      dispatchedAt: NOW,
      lastChangedAt: NOW,
      createdAt: minutesAgo(90),
    });
  });

  it('UPDATE에 안 걸리면 다시 읽어 사유를 정한다 — 다른 요청이 먼저 발송처리한 경우', async () => {
    const base = seed();
    const repository = {
      ...base,
      dispatchProductOrder: async () => {
        const order = base.productOrders.get('P_READY')!;
        base.productOrders.set('P_READY', { ...order, productOrderStatus: 'DELIVERING' as const });
        return false;
      },
    };
    const result = await dispatchProductOrders(repository, SELLER, [item('P_READY')], NOW);
    expect(result.failProductOrderInfos[0]).toMatchObject({ productOrderId: 'P_READY', code: 'INVALID_STATUS' });
  });

  it('같은 송장으로 다시 보내면 성공이고 쓰지 않는다 — 응답 유실 뒤 재시도', async () => {
    const shipped = storedOrder('P_SENT', {
      placeOrderStatus: 'OK',
      productOrderStatus: 'DELIVERING',
      deliveryCompany: 'CJ',
      trackingNumber: '123',
      dispatchedAt: minutesAgo(5),
      lastChangedAt: minutesAgo(5),
    });
    const repository = createFakeRepository({ sellers: [SELLER], productOrders: [shipped] });
    const result = await dispatchProductOrders(repository, SELLER, [item('P_SENT', { trackingNumber: ' 123 ' })], NOW);
    expect(result).toEqual({ successProductOrderIds: ['P_SENT'], failProductOrderInfos: [] });
    expect(repository.productOrders.get('P_SENT')?.lastChangedAt).toEqual(minutesAgo(5));
  });

  it('이미 배송중인데 송장이 다르면 INVALID_STATUS — 송장 수정은 범위 밖', async () => {
    const shipped = storedOrder('P_SENT', {
      placeOrderStatus: 'OK',
      productOrderStatus: 'DELIVERING',
      deliveryCompany: 'CJ',
      trackingNumber: '123',
      dispatchedAt: minutesAgo(5),
    });
    const repository = createFakeRepository({ sellers: [SELLER], productOrders: [shipped] });
    const result = await dispatchProductOrders(repository, SELLER, [item('P_SENT', { trackingNumber: '999' })], NOW);
    expect(result.failProductOrderInfos[0]).toMatchObject({ productOrderId: 'P_SENT', code: 'INVALID_STATUS' });
  });
});
