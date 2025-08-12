import { CardDescription, CardTitle } from '@/components/ui/card';

type Props = {
  total: number;
};

export const ProductTableHeader = ({ total }: Props) => {
  return (
    <div className="flex items-center justify-between">
      <CardTitle>상품 목록</CardTitle>
      <CardDescription>총 {total}개의 상품</CardDescription>
    </div>
  );
};
