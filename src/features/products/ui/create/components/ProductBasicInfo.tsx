import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { FilterSelect } from '@/components/common/FilterSelect';
import { MOCK_CATEGORY_DATA } from '@/mock/MockCategoryData';
import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/ProductTypes';

export const ProductCreateBasicinfo = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  const {
    register,
    formState: { errors },
  } = useFormContext<Product>();

  // const handleInputChange = (field: string, value: string) => {
  //   setFormData((prev) => ({ ...prev, [field]: value }));
  // };

  // 키워드 삭제
  const handleRemoveKeyword = (keyword: string) => {
    setKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  // 키워드 Enter 키 처리
  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  // 키워드 추가
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords((prev) => [...prev, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  return (
    // 기본 정보
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
        <CardDescription>상품의 기본 정보를 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerProductCode">고객사 상품코드</Label>
          <Input {...register('customerCode')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">상품명 *</Label>
          <Input {...register('name', { required: '상품명을 입력해 주세요.' })} required />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">상품 키워드</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input {...register('name')} placeholder="키워드를 입력하고 Enter를 누르세요" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              <Button type="button" onClick={handleAddKeyword} size="sm">
                추가
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                    {keyword}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveKeyword(keyword)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <FilterSelect
          label="카테고리"
          divClassName="space-y-2"
          value={category}
          onValueChange={(value) => setCategory(value)}
          options={MOCK_CATEGORY_DATA}
        />
        {/* <div className="space-y-2">
          <Label htmlFor="category">카테고리 *</Label>
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="카테고리를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전자제품">전자제품</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
      </CardContent>
    </Card>
  );
};
