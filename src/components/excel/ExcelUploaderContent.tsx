'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useExcelUploader as excelUploader } from '@/hooks/useExcelUploader';
import { ExcelTemplateInfo } from '@/types/ExcelInterface';

type Props = { contentDescription: string; fileDataInfo: ExcelTemplateInfo[] };

export const ExcelUploaderContent = ({ contentDescription, fileDataInfo }: Props) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const result = excelUploader(event, fileDataInfo);
    console.log(result);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">{contentDescription}</p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          파일 선택
        </Button>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>파일 처리 중...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
        </div>
      )}
    </div>
  );
};
