import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import { ChangeEvent, useState } from 'react';

export const ProductMainImageInfo = () => {
  const [mainImages, setMainImages] = useState<File[]>([]);

  // 이미지 업로드 처리
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setMainImages((prev) => [...prev, ...files]);
  };

  // 이미지 삭제
  const handleRemoveImage = (index: number) => {
    setMainImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>메인이미지</CardTitle>
        <CardDescription>상품의 메인 이미지를 업로드하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">이미지를 드래그하거나 클릭하여 업로드하세요</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              파일 선택
            </Button>
          </div>

          {mainImages.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {mainImages.map((file, index) => (
                <div key={index} className="relative">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">{file.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
