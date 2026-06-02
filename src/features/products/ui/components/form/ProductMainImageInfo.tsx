'use client';

import React, { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { acceptImage } from '@/constant/accept.content';
import { Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { Product } from '@/features/products/types/product.types';

export const ProductMainImageInfo = () => {
  const [mainImages, setMainImages] = useState<{ dataUrl: string; file: File } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const handleFileInputRef = useRef<HTMLInputElement>(null);

  const {
    setValue,
    formState: { errors },
    clearErrors,
  } = useFormContext<Product>();

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMainImages({ dataUrl: reader.result as string, file });
    };
    reader.readAsDataURL(file);
    setValue('mainImage', file);
    clearErrors('mainImage');
  };

  const handleClick = () => {
    handleFileInputRef.current?.click();
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveImage = () => {
    setMainImages(null);
    setValue('mainImage', '');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">메인이미지</CardTitle>
            <CardDescription className="mt-0.5">상품의 메인 이미지를 업로드하세요.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
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
                <img src={mainImages.dataUrl} alt="메인 이미지 미리보기" />
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
