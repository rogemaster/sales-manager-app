import { z } from 'zod';
import type { orders } from '@/db/schema';
import { phoneSchemaRequired } from '@/shared/utils/phone';
import { maxLengthMessage, TEXT_LIMITS } from '@/shared/utils/textLimit';
import { DELIVERY_COMPANY } from '@/shared/constant/delivery.constant';
import { ORDER_STATUS_CODES } from '../constant/status.constants';
import { OrderStatusTypes } from '../types/order.types';
import { INVALID_ORDER_STATUS_MESSAGE } from './orderStatusRule';
import { OrderRow } from './orderRecord';

/**
 * 주문 상세 저장(PATCH /api/orders/[orderId]). 폼과 route가 이 스키마 하나를 쓴다.
 * 고칠 수 있는 것은 ② 주문자·수취인과 ③ 처리 값뿐이다(2026-09-30 사용자 결정 B). ① 몰 원본은 몰에서 결제된 사실이라 잠근다.
 * 폼은 주문 객체를 통째로 보내므로 ① 필드도 오지만 Zod가 모르는 키를 버린다.
 */

export const ORDER_INVOICE_COMPANY_REQUIRED_MESSAGE = '택배사를 선택해주세요.';
export const ORDER_INVOICE_NUMBER_REQUIRED_MESSAGE = '송장번호를 입력해주세요.';
const INVALID_DELIVERY_COMPANY_MESSAGE = '택배사가 올바르지 않습니다.';

const requiredText = (emptyMessage: string, max: number) =>
  z
    .string({ required_error: emptyMessage, invalid_type_error: emptyMessage })
    .trim()
    .min(1, emptyMessage)
    .max(max, maxLengthMessage(max));

const optionalText = (max: number) => z.string().trim().max(max, maxLengthMessage(max)).nullish();

const DELIVERY_COMPANY_IDS = DELIVERY_COMPANY.map(({ id }) => id) as [string, ...string[]];

export const orderWriteSchema = z
  .object({
    orderName: requiredText('주문자명을 입력해주세요.', TEXT_LIMITS.shortText),
    orderPhoneNumber: phoneSchemaRequired('주문자 연락처를 입력해주세요.'),
    orderZipCode: requiredText('주문자 우편번호를 입력해주세요.', TEXT_LIMITS.shortText),
    orderAddress: requiredText('주문자 주소를 입력해주세요.', TEXT_LIMITS.longText),
    orderDetailAddress: optionalText(TEXT_LIMITS.longText),
    payeeName: requiredText('수취인명을 입력해주세요.', TEXT_LIMITS.shortText),
    payeePhoneNumber: phoneSchemaRequired('수취인 연락처를 입력해주세요.'),
    payeeZipCode: requiredText('수취인 우편번호를 입력해주세요.', TEXT_LIMITS.shortText),
    payeeAddress: requiredText('수취인 주소를 입력해주세요.', TEXT_LIMITS.longText),
    payeeDetailAddress: optionalText(TEXT_LIMITS.longText),
    deliveryMessage: optionalText(TEXT_LIMITS.longText),
    orderStatus: z.enum(ORDER_STATUS_CODES, { errorMap: () => ({ message: INVALID_ORDER_STATUS_MESSAGE }) }),
    // 폼을 연 시점의 상태. 사용자가 상태를 안 건드린 저장을 가려내는 데만 쓴다(resolveRequestedStatus).
    baseStatus: z.enum(ORDER_STATUS_CODES, { errorMap: () => ({ message: INVALID_ORDER_STATUS_MESSAGE }) }).optional(),
    deliveryCompany: z
      .union([z.enum(DELIVERY_COMPANY_IDS), z.literal('')], {
        errorMap: () => ({ message: INVALID_DELIVERY_COMPANY_MESSAGE }),
      })
      .nullish(),
    invoiceNumber: optionalText(TEXT_LIMITS.shortText),
    // 클레임 유형·고객 사유는 몰 원본이라 받지 않는다.
    claim: z
      .object({ handlerNote: z.string().max(TEXT_LIMITS.longText, maxLengthMessage(TEXT_LIMITS.longText)) })
      .nullish(),
  })
  .superRefine((value, ctx) => {
    // 송장 없는 송장등록 주문은 송장 전송(라운드 4)에서 보낼 것이 없다.
    if (value.orderStatus !== 'INVOICE_REGISTER') return;
    if (!value.deliveryCompany) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryCompany'],
        message: ORDER_INVOICE_COMPANY_REQUIRED_MESSAGE,
      });
    }
    if (!value.invoiceNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['invoiceNumber'],
        message: ORDER_INVOICE_NUMBER_REQUIRED_MESSAGE,
      });
    }
  });

export type OrderWriteValues = z.infer<typeof orderWriteSchema>;

/** 수정 route가 SET에 넣는 컬럼. ① 몰 원본은 여기 없으므로 무엇을 보내도 바뀌지 않는다 — 최종 방어선. */
export const ORDER_WRITE_FIELDS = [
  'orderName',
  'orderPhoneNumber',
  'orderZipCode',
  'orderAddress',
  'orderDetailAddress',
  'payeeName',
  'payeePhoneNumber',
  'payeeZipCode',
  'payeeAddress',
  'payeeDetailAddress',
  'deliveryMessage',
  'orderStatus',
  'deliveryCompany',
  'invoiceNumber',
] as const;

type OrderWriteField = (typeof ORDER_WRITE_FIELDS)[number];
type OrderInsert = typeof orders.$inferInsert;
export type OrderUpdate = Pick<OrderInsert, OrderWriteField> & Partial<Pick<OrderInsert, 'invoiceRegisteredAt'>>;

const toNullable = (value: string | null | undefined): string | null => (value ? value : null);

/**
 * 이번 저장이 요청하는 상태. 폼은 상태를 안 건드려도 연 시점의 상태를 늘 보낸다 — 그대로 쓰면
 * 폼을 연 사이 다른 사용자(또는 일괄변경)가 바꾼 상태를 주소만 고친 저장이 오류 없이 되돌린다.
 * 보낸 상태가 연 시점 상태와 같으면 사용자가 바꾸지 않은 것이라 현재 DB 상태를 유지한다.
 */
export const resolveRequestedStatus = (
  current: OrderStatusTypes,
  base: OrderStatusTypes | undefined,
  requested: OrderStatusTypes,
): OrderStatusTypes => (base !== undefined && requested === base ? current : requested);

/** 상세 저장의 SET. 송장등록일은 상태가 송장등록으로 "바뀔 때만" 기록한다 — 송장번호만 고쳐도 날짜는 그대로다. */
export const buildOrderUpdate = (
  values: OrderWriteValues,
  currentStatus: OrderStatusTypes,
  now: Date,
): OrderUpdate => ({
  orderName: values.orderName,
  orderPhoneNumber: values.orderPhoneNumber,
  orderZipCode: values.orderZipCode,
  orderAddress: values.orderAddress,
  orderDetailAddress: toNullable(values.orderDetailAddress),
  payeeName: values.payeeName,
  payeePhoneNumber: values.payeePhoneNumber,
  payeeZipCode: values.payeeZipCode,
  payeeAddress: values.payeeAddress,
  payeeDetailAddress: toNullable(values.payeeDetailAddress),
  deliveryMessage: toNullable(values.deliveryMessage),
  orderStatus: values.orderStatus,
  deliveryCompany: toNullable(values.deliveryCompany),
  invoiceNumber: toNullable(values.invoiceNumber),
  ...(values.orderStatus === 'INVOICE_REGISTER' && currentStatus !== 'INVOICE_REGISTER'
    ? { invoiceRegisteredAt: now }
    : {}),
});

/**
 * 수정 이력에 남길 바뀐 필드 키. DB null·폼 ''·undefined는 같은 "비어 있음"이다 — 구분하면 아무것도 안 고친 저장이 이력을 남긴다.
 * claimNote.next가 undefined면 메모를 보내지 않은 것이라 세지 않는다.
 */
export const diffOrderFields = (
  current: Pick<OrderRow, OrderWriteField>,
  update: OrderUpdate,
  claimNote?: { current: string; next: string | undefined },
): string[] => {
  const same = (a: unknown, b: unknown) => (a ?? '') === (b ?? '');
  const changed: string[] = ORDER_WRITE_FIELDS.filter((key) => !same(current[key], update[key]));
  if (claimNote && claimNote.next !== undefined && claimNote.next !== claimNote.current) {
    changed.push('claim.handlerNote');
  }
  return changed;
};
