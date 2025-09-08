import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export const ProductPriceAndQuantityInfo = () => {
  const [supplyPrice, setSupplyPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [deliveryType, setDeliveryType] = useState<string>('');
  const [deliveryPrice, setDeliveryPrice] = useState<number>(0);

  return (
    // 가격 및 수량 정보
    <Card>
      <CardHeader>
        <CardTitle>가격 및 수량 정보</CardTitle>
        <CardDescription>상품의 가격과 수량 정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="supplyPrice">공급가 *</Label>
            <Input
              id="supplyPrice"
              type="number"
              value={supplyPrice}
              onChange={(e) => setSupplyPrice(Number(e.target.value))}
              placeholder="0"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salePrice">판매가 *</Label>
            <Input
              id="salePrice"
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              placeholder="0"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalQuantity">총수량 *</Label>
          <Input
            id="totalQuantity"
            type="number"
            value={totalQuantity}
            onChange={(e) => setTotalQuantity(Number(e.target.value))}
            placeholder="0"
            required
          />
        </div>

        {/* 배송 정보 */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">배송 정보</h4>
          <div className="space-y-2">
            <Label htmlFor="shippingPolicy">배송정책 *</Label>
            <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="배송정책을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">무료배송</SelectItem>
                <SelectItem value="cod">착불</SelectItem>
                <SelectItem value="prepaid">선결제</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliveryType === 'prepaid' && (
            <div className="space-y-2">
              <Label htmlFor="shippingFee">배송비 *</Label>
              <Input
                id="shippingFee"
                type="number"
                value={deliveryPrice}
                onChange={(e) => setDeliveryPrice(Number(e.target.value))}
                placeholder="0"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
