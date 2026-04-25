import React, { ChangeEvent, useRef, useState } from 'react';
import { acceptImage } from '@/constant/accept.content';
import { Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';

export const ProductMainImageInfo = () => {
  const [mainImages, setMainImages] = useState<{ dataUrl: string; file: File } | null>(null);
  const handleFileInputRef = useRef<HTMLInputElement>(null);

  const {
    setValue,
    formState: { errors },
    clearErrors,
  } = useFormContext<Product>();

  const handleClick = () => {
    if (handleFileInputRef.current) {
      handleFileInputRef.current.click();
    }
  };

  // 이미지 업로드 처리
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      Array.from(event.target.files).map((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMainImages({
            dataUrl: reader.result as string,
            file,
          });
        };
        reader.readAsDataURL(file);
        setValue('mainImage', file);
        clearErrors('mainImage');
      });
    }
  };

  // 이미지 삭제
  const handleRemoveImage = () => {
    setMainImages(null);
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
              accept={acceptImage}
              onChange={handleImageUpload}
              className="hidden"
              ref={handleFileInputRef}
            />
            <Button type="button" className="cursor-pointer" variant="outline" size="sm" onClick={handleClick}>
              파일 선택
            </Button>
          </div>

          {mainImages && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <img src={mainImages?.dataUrl} />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
        {errors.mainImage && <p className="text-red-500 text-sm">{errors.mainImage.message}</p>}
      </CardContent>
    </Card>
  );
};
