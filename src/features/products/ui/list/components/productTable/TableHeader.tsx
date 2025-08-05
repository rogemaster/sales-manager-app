import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const ProductListHeader = () => {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>상품 목록</CardTitle>
        <CardDescription>총 5개의 상품</CardDescription>
      </div>
    </CardHeader>
  )
}