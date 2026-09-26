import { z } from 'zod';
import { FilterOption } from '@/types/common.type';
import { SHOPPING_MALL_CODES } from '@/shared/constant/shoppingMall.constant';
import { ALL_FILTER_OPTION } from '@/shared/constant/filter.constant';
import { filterCodeSchema, filterTextSchema, listPageFields, searchDateSchema } from '@/shared/utils/listRequest';
import { TEXT_LIMITS } from '@/shared/utils/textLimit';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import {
  MALL_LINK_SEND_LIMIT_MESSAGE,
  MALL_LINK_SEND_MAX_ITEMS,
  MALL_LINK_STATUS_OPTIONS,
  MALL_LINKED_DATE_TYPE,
  MALL_LINKED_SEARCH_TYPE,
} from '@/features/mallLinkedProduct/constant/mallLinkedProduct.constants';

const ids = (options: FilterOption[]) => options.map(({ id }) => id);
const withAll = (options: FilterOption[]) => [ALL_FILTER_OPTION.id, ...ids(options)];

/** POST /api/shopping/linked-products/list 요청. */
export const mallLinkedProductListRequestSchema = z.object({
  filters: z.object({
    dateType: filterCodeSchema(ids(MALL_LINKED_DATE_TYPE)),
    startDate: searchDateSchema,
    endDate: searchDateSchema,
    mallCode: filterCodeSchema([ALL_FILTER_OPTION.id, ...SHOPPING_MALL_CODES]),
    // 'ALL' 또는 id. 남의 id여도 owner_id 조건 때문에 0건일 뿐이다.
    mallAccountId: filterTextSchema(TEXT_LIMITS.shortText),
    shoppingSettingId: filterTextSchema(TEXT_LIMITS.shortText),
    linkStatus: filterCodeSchema(withAll(MALL_LINK_STATUS_OPTIONS)),
    saleState: filterCodeSchema(withAll(PRODUCT_STATUS)),
    searchType: filterCodeSchema(ids(MALL_LINKED_SEARCH_TYPE)),
    searchValue: filterTextSchema(TEXT_LIMITS.search),
  }),
  ...listPageFields,
});

const INVALID_SEND_TARGET_MESSAGE = '전송 대상이 올바르지 않습니다.';
const sendTargetError = {
  required_error: INVALID_SEND_TARGET_MESSAGE,
  invalid_type_error: INVALID_SEND_TARGET_MESSAGE,
};

/**
 * POST /api/shopping/linked-products 요청(신규 전송).
 * mallCode는 받지 않는다 — 서버는 shoppingSettingId로 읽은 설정의 몰을 따른다(클라이언트 값을 믿지 않는다).
 * 같은 상품 × 같은 설정이 여러 번 와도 걸러내지 않는다 — 같은 상품을 같은 몰로 여러 번 전송할 수 있다(domain-design.md).
 */
export const mallLinkedProductSendRequestSchema = z.object({
  items: z
    .array(
      z.object({ productId: z.string(sendTargetError), shoppingSettingId: z.string(sendTargetError) }, sendTargetError),
      sendTargetError,
    )
    .max(MALL_LINK_SEND_MAX_ITEMS, MALL_LINK_SEND_LIMIT_MESSAGE),
});

const INVALID_RESEND_TARGET_MESSAGE = '재전송 대상이 올바르지 않습니다.';
const resendTargetError = {
  required_error: INVALID_RESEND_TARGET_MESSAGE,
  invalid_type_error: INVALID_RESEND_TARGET_MESSAGE,
};

/** POST /api/shopping/linked-products/resend 요청. 중복 id 처리는 resendLinkedProducts가 한다. */
export const mallLinkedProductResendRequestSchema = z.object({
  ids: z
    .array(z.string(resendTargetError), resendTargetError)
    .max(MALL_LINK_SEND_MAX_ITEMS, MALL_LINK_SEND_LIMIT_MESSAGE),
});

const INVALID_SNAPSHOT_MESSAGE = '저장할 값이 올바르지 않습니다.';
const snapshotObject = z.record(z.unknown(), {
  required_error: INVALID_SNAPSHOT_MESSAGE,
  invalid_type_error: INVALID_SNAPSHOT_MESSAGE,
});

/**
 * PATCH /api/shopping/linked-products/[id] 요청.
 * 스냅샷 안의 값은 검사하지 않는다 — 전송값의 최종 판정은 외부몰이 한다(domain-design.md "검증 책임은 외부 쇼핑몰에 있다").
 * 쇼핑몰·계정 불변은 buildSnapshotUpdate가 SET에서 빼는 것으로 지킨다.
 */
export const mallLinkedProductUpdateRequestSchema = z.object({
  productSnapshot: snapshotObject,
  settingSnapshot: snapshotObject,
});

const NOTHING_TO_UPDATE_MESSAGE = '수정할 내용이 없습니다.';

/**
 * PATCH /api/shopping/linked-products/bulk 요청. 스냅샷 값은 위와 같은 이유로 검사하지 않는다.
 * 필수 키를 clearKeys로 지우지 못하게 막는 것은 mergeProductSnapshot이 한다.
 */
export const mallLinkedProductBulkUpdateRequestSchema = z
  .object({
    ids: z.array(z.string(), {
      required_error: NOTHING_TO_UPDATE_MESSAGE,
      invalid_type_error: NOTHING_TO_UPDATE_MESSAGE,
    }),
    productSnapshot: z.record(z.unknown(), { invalid_type_error: INVALID_SNAPSHOT_MESSAGE }).optional(),
    shoppingSettingId: z.string({ invalid_type_error: INVALID_SNAPSHOT_MESSAGE }).optional(),
    // 값을 비우는 요청도 "무언가를 요청했다"에 해당한다 — clearKeys만 온 요청은 정상이다.
    clearKeys: z.array(z.string(), { invalid_type_error: INVALID_SNAPSHOT_MESSAGE }).optional(),
  })
  .refine(
    ({ productSnapshot, shoppingSettingId, clearKeys }) =>
      !!productSnapshot || !!shoppingSettingId || (clearKeys?.length ?? 0) > 0,
    NOTHING_TO_UPDATE_MESSAGE,
  );
