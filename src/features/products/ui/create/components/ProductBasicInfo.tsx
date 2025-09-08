import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export const ProductCreateBasicinfo = () => {
  const [customerProductCode, setCustomerProductCode] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [category, setCategory] = useState<string>('');

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
          <Label htmlFor="customerProductCode">고객사 상품코드 *</Label>
          <Input
            id="customerProductCode"
            value={customerProductCode}
            onChange={(e) => setCustomerProductCode(e.target.value)}
            placeholder="고객사 상품코드를 입력하세요"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">상품명 *</Label>
          <Input
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="상품명을 입력하세요"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">상품 키워드</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="키워드를 입력하고 Enter를 누르세요"
              />
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

        <div className="space-y-2">
          <Label htmlFor="category">카테고리 *</Label>
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="카테고리를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전자제품">전자제품</SelectItem>
              <SelectItem value="의류">의류</SelectItem>
              <SelectItem value="액세서리">액세서리</SelectItem>
              <SelectItem value="가구">가구</SelectItem>
              <SelectItem value="도서">도서</SelectItem>
              <SelectItem value="식품">식품</SelectItem>
              <SelectItem value="화장품">화장품</SelectItem>
              <SelectItem value="스포츠">스포츠</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
