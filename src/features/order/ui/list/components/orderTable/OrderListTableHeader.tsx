import { CardDescription, CardTitle } from '@/components/ui/card';

type Props = {
  total: number;
};

export const OrderListTableHeader = ({ total }: Props) => {
  return (
    <div className="flex items-center justify-between">
      <CardTitle>주문 목록</CardTitle>
      <CardDescription>총 {total}개의 주문</CardDescription>
    </div>
  );
};
