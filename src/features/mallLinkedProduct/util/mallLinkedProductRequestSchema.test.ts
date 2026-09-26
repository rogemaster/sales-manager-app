import { describe, it, expect } from 'vitest';
import { INVALID_FILTER_MESSAGE } from '@/shared/utils/listRequest';
import {
  MALL_LINK_SEND_LIMIT_MESSAGE,
  MALL_LINK_SEND_MAX_ITEMS,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';
import {
  mallLinkedProductBulkUpdateRequestSchema,
  mallLinkedProductListRequestSchema,
  mallLinkedProductResendRequestSchema,
  mallLinkedProductSendRequestSchema,
  mallLinkedProductUpdateRequestSchema,
} from './mallLinkedProductRequestSchema';

const messageOf = (result: { error?: { issues: { message: string }[] } }) => result.error?.issues[0]?.message;

const FILTERS = {
  dateType: 'lastSentAt',
  startDate: '2026-09-01',
  endDate: '2026-09-27',
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  shoppingSettingId: 'ALL',
  linkStatus: 'ALL',
  saleState: 'ALL',
  searchType: 'productName',
  searchValue: '',
};

describe('mallLinkedProductListRequestSchema', () => {
  it('화면이 보내는 요청을 통과시킨다', () => {
    const filters = {
      ...FILTERS,
      mallCode: 'NSST',
      linkStatus: 'failed',
      saleState: 'ON_SALE',
      searchType: 'updatedBy',
    };
    const body = { filters, page: 1, pageSize: 10 };
    expect(mallLinkedProductListRequestSchema.parse(body)).toEqual(body);
  });

  it.each([
    ['dateType', 'createdAt'],
    ['linkStatus', 'pending'],
    ['saleState', '판매중'],
    ['searchType', 'brand'],
  ])('%s가 목록 밖(%s)이면 거절한다', (key, value) => {
    const result = mallLinkedProductListRequestSchema.safeParse({ filters: { ...FILTERS, [key]: value } });
    expect(messageOf(result)).toBe(INVALID_FILTER_MESSAGE);
  });
});

describe('mallLinkedProductSendRequestSchema', () => {
  const item = { productId: 'P1', shoppingSettingId: 'ss_1', mallCode: 'NSST' };

  it('mallCode는 버리고 상품·설정 id만 남긴다', () => {
    expect(mallLinkedProductSendRequestSchema.parse({ items: [item] })).toEqual({
      items: [{ productId: 'P1', shoppingSettingId: 'ss_1' }],
    });
  });

  it('같은 상품 × 설정이 여러 번 와도 걸러내지 않는다', () => {
    expect(mallLinkedProductSendRequestSchema.parse({ items: [item, item] }).items).toHaveLength(2);
  });

  it.each([{}, { items: null }, { items: [null] }, { items: [{ productId: 'P1' }] }])(
    '전송 대상 모양이 틀리면 거절한다: %j',
    (body) => {
      expect(messageOf(mallLinkedProductSendRequestSchema.safeParse(body))).toBe('전송 대상이 올바르지 않습니다.');
    },
  );

  it('건수 상한을 넘으면 기존 문구로 거절한다', () => {
    const items = Array(MALL_LINK_SEND_MAX_ITEMS + 1).fill(item);
    expect(messageOf(mallLinkedProductSendRequestSchema.safeParse({ items }))).toBe(MALL_LINK_SEND_LIMIT_MESSAGE);
  });
});

describe('mallLinkedProductResendRequestSchema', () => {
  it('ids를 받은 그대로 넘긴다(중복 처리는 resendLinkedProducts 몫)', () => {
    expect(mallLinkedProductResendRequestSchema.parse({ ids: ['a', 'a'] })).toEqual({ ids: ['a', 'a'] });
  });

  it('모양이 틀리거나 상한을 넘으면 거절한다', () => {
    expect(messageOf(mallLinkedProductResendRequestSchema.safeParse({ ids: 'a' }))).toBe(
      '재전송 대상이 올바르지 않습니다.',
    );
    const ids = Array(MALL_LINK_SEND_MAX_ITEMS + 1).fill('a');
    expect(messageOf(mallLinkedProductResendRequestSchema.safeParse({ ids }))).toBe(MALL_LINK_SEND_LIMIT_MESSAGE);
  });
});

describe('mallLinkedProductUpdateRequestSchema', () => {
  it('스냅샷 안의 값은 검사하지 않는다', () => {
    const body = { productSnapshot: { name: '' }, settingSnapshot: { nickname: 1 } };
    expect(mallLinkedProductUpdateRequestSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    { productSnapshot: {} },
    { productSnapshot: [], settingSnapshot: {} },
    { productSnapshot: null, settingSnapshot: {} },
  ])('스냅샷이 객체가 아니면 거절한다: %j', (body) => {
    expect(messageOf(mallLinkedProductUpdateRequestSchema.safeParse(body))).toBe('저장할 값이 올바르지 않습니다.');
  });
});

describe('mallLinkedProductBulkUpdateRequestSchema', () => {
  it.each([
    { ids: ['a'], productSnapshot: { price: 1 } },
    { ids: ['a'], shoppingSettingId: 'ss_1' },
    { ids: ['a'], clearKeys: ['modelName'] },
  ])('바꿀 내용이 하나라도 있으면 통과한다: %j', (body) => {
    expect(mallLinkedProductBulkUpdateRequestSchema.safeParse(body).success).toBe(true);
  });

  it.each([{ ids: ['a'] }, { ids: ['a'], clearKeys: [] }, { productSnapshot: { price: 1 } }])(
    '수정할 내용이 없거나 ids가 없으면 거절한다: %j',
    (body) => {
      expect(messageOf(mallLinkedProductBulkUpdateRequestSchema.safeParse(body))).toBe('수정할 내용이 없습니다.');
    },
  );
});
