import { OrderStatusTypes } from '@/features/order/types/order.types';
import { Badge } from '../../../../components/ui/badge';
import { ORDER_STATUS } from '@/features/order/constant/status.constants';

type Props = {
  status: OrderStatusTypes;
  className?: string;
};

const STATUS_VARIANT_MAP: Record<
  OrderStatusTypes,
  | 'waitSale'
  | 'onSale'
  | 'soldOut'
  | 'saleDisc'
  | 'newOrder'
  | 'confirmedOrder'
  | 'invoiceRegister'
  | 'invoiceComplete'
  | 'cancelOrder'
  | 'exchangeOrder'
  | 'returnOrder'
> = {
  NEW_ORDER: 'newOrder',
  CONFIRMED_ORDER: 'confirmedOrder',
  INVOICE_REGISTER: 'invoiceRegister',
  INVOICE_COMPLETE: 'invoiceComplete',
  REQUEST_CANCEL: 'cancelOrder',
  PROGRESS_CANCEL: 'cancelOrder',
  COMPLETE_CANCEL: 'cancelOrder',
  REQUEST_EXCHANGE: 'exchangeOrder',
  PROGRESS_EXCHANGE: 'exchangeOrder',
  COMPLETE_EXCHANGE: 'exchangeOrder',
  REQUEST_RETURN: 'returnOrder',
  PROGRESS_RETURN: 'returnOrder',
  COMPLETE_RETURN: 'returnOrder',
} as const;

export const OrderStatusBadge = ({ status, className }: Props) => {
  const { name } = ORDER_STATUS.find((value) => value.id === status)!;
  const variant = STATUS_VARIANT_MAP[status];

  return (
    <Badge variant={variant} className={className}>
      {name}
    </Badge>
  );
};
