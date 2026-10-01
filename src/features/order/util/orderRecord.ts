import type { orderClaims, orderComments, orderEditHistories, orders } from '@/db/schema';
import { toKstDateTime } from '@/shared/utils/date';
import { Order, OrderClaim, OrderComment, OrderEditHistory } from '../types/order.types';

/** DB 행 → 응답 타입. 시각은 KST 문자열로, null은 응답에서 뺀다(화면이 `?:` 필드로 읽는다). */

export type OrderRow = typeof orders.$inferSelect;
export type OrderClaimRow = typeof orderClaims.$inferSelect;
export type OrderCommentRow = typeof orderComments.$inferSelect;
export type OrderEditHistoryRow = typeof orderEditHistories.$inferSelect;

const optional = (value: string | null): string | undefined => value ?? undefined;
const optionalTime = (value: Date | null): string | undefined => (value ? toKstDateTime(value) : undefined);

export const toOrder = (row: OrderRow): Order => ({
  orderNumber: row.orderNumber,
  shopOrderNumber: row.shopOrderNumber,
  orderStatus: row.orderStatus,
  paymentDate: toKstDateTime(row.paymentDate),
  orderCollectionDate: toKstDateTime(row.collectedAt),
  mallCode: row.mallCode,
  mallId: row.mallId,
  shopProductId: row.shopProductId,
  orderProductName: row.orderProductName,
  orderPrice: row.orderPrice,
  orderTotalQuantity: row.orderTotalQuantity,
  orderOption: optional(row.orderOption),
  orderSubOption: optional(row.orderSubOption),
  orderSubTotalQuantity: optional(row.orderSubTotalQuantity),
  orderDeliveryType: row.orderDeliveryType,
  orderDeliveryPrice: row.orderDeliveryPrice,
  orderName: row.orderName,
  payeeName: row.payeeName,
  orderPhoneNumber: row.orderPhoneNumber,
  payeePhoneNumber: row.payeePhoneNumber,
  orderZipCode: row.orderZipCode,
  orderAddress: row.orderAddress,
  orderDetailAddress: optional(row.orderDetailAddress),
  payeeZipCode: row.payeeZipCode,
  payeeAddress: row.payeeAddress,
  payeeDetailAddress: optional(row.payeeDetailAddress),
  deliveryMessage: optional(row.deliveryMessage),
  deliveryCompany: optional(row.deliveryCompany),
  invoiceNumber: optional(row.invoiceNumber),
  invoiceRegisteredAt: optionalTime(row.invoiceRegisteredAt),
  invoiceSentAt: optionalTime(row.invoiceSentAt),
  ownerId: row.ownerId,
});

export const toOrderClaim = (row: OrderClaimRow): OrderClaim => ({
  claimType: row.claimType,
  claimMessage: row.claimMessage,
  handlerNote: row.handlerNote,
});

export const toOrderComment = (row: OrderCommentRow): OrderComment => ({
  id: String(row.id),
  content: row.content,
  authorName: row.authorName,
  createdAt: toKstDateTime(row.createdAt),
});

export const toOrderEditHistory = (row: OrderEditHistoryRow): OrderEditHistory => ({
  id: String(row.id),
  modifiedAt: toKstDateTime(row.modifiedAt),
  modifiedBy: row.modifiedByName,
  changedFields: row.changedFields,
});
