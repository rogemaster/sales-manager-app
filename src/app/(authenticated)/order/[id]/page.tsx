import { OrderDetailLayout } from '@/features/order/ui/detail';

type Props = {
  params: Promise<{ id: string }>;
};

const OrderDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  return <OrderDetailLayout orderId={id} />;
};

export default OrderDetailPage;
