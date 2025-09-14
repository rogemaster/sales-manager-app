import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/ProductTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export const ProductDetailInfo = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<Product>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>상품상세설명</CardTitle>
        <CardDescription>상품에 대한 자세한 설명을 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          {...register('detailPage', { required: '상품상세설명을 입력하세요.' })}
          placeholder="상세설명 입력"
          rows={10}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
};
