'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { processExcelUpload } from '@/hooks/processExcelUpload';
import { ExcelTemplateInfo } from '@/types/ExcelInterface';
import { useAlert } from '@/hooks/useAlert';
import { useSetAtom } from 'jotai';
import { setExcelDataAtom } from '@/store/excelDataStore';
import { excelUploadErrorCodeToMessage, excelValidErrorsCodeToMessages } from './message';

type Props = {
  contentDescription: string;
  fileTemplateInfo: ExcelTemplateInfo[];
};

export const ExcelUploaderContent = <T extends Record<string, unknown>>({
  contentDescription,
  fileTemplateInfo,
}: Props) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();

  const setExcelData = useSetAtom(setExcelDataAtom);

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await processExcelUpload(event, fileTemplateInfo);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 결과에 따른 alert 표시 및 상태 업데이트
      if (result.success && result.data) {
        showAlert({
          type: 'success',
          message: '업로드가 완료되었습니다.',
        });

        console.log('최종 업로드 데이터', result.data);
        setExcelData(result.data as T[]);
      }

      if (!result.success && result.errorType === 'UPLOAD_ERROR') {
        const message = excelUploadErrorCodeToMessage(result.uploadError!);
        showAlert({
          type: 'error',
          message,
        });
      }

      if (!result.success && result.errorType === 'VALIDATE_ERROR') {
        const message = excelValidErrorsCodeToMessages(result.validationResult!.errors!);
        showAlert({
          type: 'error',
          message: message[0],
        });
      }
    } catch {
      showAlert({
        type: 'error',
        message: '파일 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
