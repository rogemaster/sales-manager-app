// import { getProductStatusName } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PRODUCT_STATUS } from '@/features/products/constant/ProductInfo';
import { ProductStateType } from '@/features/products/types/ProductTypes';

type Props = {
  status: ProductStateType;
  className?: string;
};

const STATUS_VARIANT_MAP: Record<ProductStateType, 'waitSale' | 'onSale' | 'soldOut' | 'saleDisc'> = {
  WAIT_SALE: 'waitSale',
  ON_SALE: 'onSale',
  SOLD_OUT: 'soldOut',
  SALE_DIS: 'saleDisc',
} as const;

export const ProductStatusBadge = ({ status, className }: Props) => {
  const { name } = PRODUCT_STATUS.find((value) => value.id === status)!;
  const variant = STATUS_VARIANT_MAP[status];

  return (
    <Badge variant={variant} className={className}>
      {name}
    </Badge>
  );
};
