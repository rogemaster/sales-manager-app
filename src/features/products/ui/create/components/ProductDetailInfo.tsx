import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export const ProductDetailInfo = () => {
  const [productDescription, setProductDescription] = useState<string>('');

  return (
    <Card>
      <CardHeader>
        <CardTitle>상품상세설명</CardTitle>
        <CardDescription>상품에 대한 자세한 설명을 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          placeholder="상세설명 입력"
          rows={10}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
};
