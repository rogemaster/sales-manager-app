'use client';

import React, { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { acceptImage } from '@/constant/accept.content';
import { ImageIcon, Upload, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useController, useFormContext } from 'react-hook-form';
import { ProductFormValues } from '@/features/products/types/product.types';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@/shared/constant/upload.constant';
import { toProductImageUrl } from '@/features/products/util/productImage';

export const ProductMainImageInfo = () => {
  // 새로 고른 파일의 미리보기 주소. 파일 자체는 폼(field.value)이 들고 있다.
  const [selectedDataUrl, setSelectedDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const handleFileInputRef = useRef<HTMLInputElement>(null);

  const { control, setError } = useFormContext<ProductFormValues>();

  // File|string을 직접 들고 있어 register()로는 검증이 붙지 않는다. useController로 등록해야
  // handleSubmit(등록·수정)과 trigger()(연동상품 수정) 양쪽이 같은 규칙을 본다.
  const {
    field,
    fieldState: { error },
  } = useController({
    control,
    name: 'mainImage',
    rules: { required: '메인이미지를 선택해 주세요.' },
  });

  // 새로 고른 파일이 있으면 그 데이터 URL을, 없으면 폼에 들어 있는 저장된 값을 그린다.
  // 수정 화면은 저장된 값(R2 key)으로 시작하므로 이 두 번째 경로가 없으면
  // 이미지가 있는 상품인데도 빈 업로드 박스만 보인다.
  const previewUrl = selectedDataUrl ?? (typeof field.value === 'string' ? toProductImageUrl(field.value) : '');

  // 주소가 바뀌면 앞선 실패를 지운다. 실패한 채로 남으면 새로 고른 이미지까지 회색 박스가 된다.
  useEffect(() => {
    setHasLoadError(false);
  }, [previewUrl]);

  const processFile = (file: File) => {
    // 파일 선택 창은 accept로 거르지만 드래그는 아무 파일이나 들어온다. 서버와 같은 목록으로 여기서 막는다.
    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
      setError('mainImage', { type: 'manual', message: 'PNG 또는 JPG 이미지만 업로드할 수 있습니다.' });
      return;
    }

    // 4.5MB를 넘으면 Vercel이 route 도달 전에 413으로 끊어 사용자가 원인을 알 수 없다.
    // 여기서 먼저 막아 의미 있는 메시지를 보여준다. 서버 검증은 그대로 유지된다.
    if (file.size > MAX_IMAGE_BYTES) {
      setError('mainImage', { type: 'manual', message: '4MB 이하 이미지를 업로드해 주세요.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    field.onChange(file);
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
    setSelectedDataUrl(null);
    field.onChange('');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">메인이미지 *</CardTitle>
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

          {previewUrl && (
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                {/* 버킷에 25일 수명주기 규칙이 걸려 있어 "key는 있는데 객체가 없는" 상태가 일상적으로 생긴다. */}
                {hasLoadError ? (
                  <div className="flex aspect-square w-full items-center justify-center rounded border border-border/60 bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                ) : (
                  <img src={previewUrl} alt="메인 이미지 미리보기" onError={() => setHasLoadError(true)} />
                )}
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
        {error && <p className="text-red-500 text-sm">{error.message}</p>}
      </CardContent>
    </Card>
  );
};
