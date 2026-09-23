'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { processExcelUpload } from '@/components/excel/utils/processExcelUpload';
import { checkExcelImageColumns } from '@/components/excel/utils/checkExcelImageColumns';
import { checkExcelUniqueCodeColumns } from '@/components/excel/utils/checkExcelUniqueCodeColumns';
import { checkCustomerCodes } from '@/features/products/api/checkCustomerCodes';
import { getSheetRow } from '@/components/excel/utils/sheetRows';
import { ExcelTemplateInfo } from '@/types/excel.type';
import { useAlert } from '@/hooks/useAlert';
import { useSetAtom } from 'jotai';
import { setExcelDataAtom } from '@/components/excel/store/excelData.store';
import { checkProductImage } from '@/features/products/api/checkProductImage';
import { REMOTE_IMAGE_CONCURRENCY } from '@/shared/constant/upload.constant';
import { isUnauthorizedError } from '@/shared/utils/unauthorized';
import { excelUploadErrorCodeToMessage, excelValidErrorsCodeToMessages } from './message';

type Props = {
  contentDescription: string;
  fileTemplateInfo: ExcelTemplateInfo[];
  maxRows?: number;
};

type ImageProgress = { done: number; total: number };

export const ExcelUploaderContent = ({ contentDescription, fileTemplateInfo, maxRows }: Props) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageProgress, setImageProgress] = useState<ImageProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const setExcelData = useSetAtom(setExcelDataAtom);

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 진행률 시뮬레이션
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressIntervalRef.current!);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await processExcelUpload(event, fileTemplateInfo, maxRows);

      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;

      // 파일 자체 오류 - 100% 없이 즉시 에러 표시
      if (!result.success && result.errorType === 'UPLOAD_ERROR') {
        showAlert({ type: 'error', message: excelUploadErrorCodeToMessage(result.uploadError!, maxRows) });
        return;
      }

      // 잘못된 양식 - 필수 컬럼이 없는 경우, 미리보기 불가. 이미지 확인도 하지 않는다.
      if (!result.success && result.errorType === 'VALIDATE_ERROR') {
        showAlert({
          type: 'error',
          message: '엑셀 양식이 올바르지 않습니다. 제공된 양식을 다운로드하여 사용해 주세요.',
        });
        return;
      }

      if (!result.data) return;
      const rows = result.data;

      // 코드 중복 확인은 요청 하나라 진행률을 따로 두지 않는다. 필드 오류가 있는 행도 확인한다.
      const codeErrors = await checkExcelUniqueCodeColumns(rows, fileTemplateInfo, checkCustomerCodes);

      // 이미지 확인은 필드 검사 뒤에 한다. 필드 오류가 있는 행도 확인해 모든 오류를 한 번에 보여준다.
      // 필드 검사 결과가 "오류 없음"이어도 이미지 오류가 생길 수 있으므로, 둘을 합친 뒤 한 경로에서 처리한다.
      const imageErrors = await checkExcelImageColumns(rows, fileTemplateInfo, checkProductImage, {
        concurrency: REMOTE_IMAGE_CONCURRENCY,
        onProgress: (done, total) => setImageProgress({ done, total }),
      });

      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const errors = excelValidErrorsCodeToMessages([
        ...(result.validationResult?.errors ?? []),
        ...codeErrors,
        ...imageErrors,
      ]);

      if (errors.length === 0) {
        showAlert({ type: 'success', message: '업로드가 완료되었습니다.' });
        setExcelData(rows);
        return;
      }

      // 오류가 있는 엑셀도 미리보기는 가능하다. 오류 행은 저장 대상에서 빠진다.
      const errorRowCount = new Set(errors.map((e) => e.row)).size;
      showAlert({
        type: 'error',
        message: `${errorRowCount}개 행에 유효성 오류가 있습니다. 오류 내용을 확인하세요.`,
      });

      setExcelData(rows.map((item) => ({ ...item, error: errors.filter((value) => value.row === getSheetRow(item)) })));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await signOut({ callbackUrl: '/login' });
        return;
      }
      showAlert({
        type: 'error',
        message: '파일 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setImageProgress(null);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const progressLabel = imageProgress ? '이미지 확인 중...' : '파일 처리 중...';
  const progressCount = imageProgress ? `${imageProgress.done} / ${imageProgress.total}` : `${uploadProgress}%`;
  const progressValue = imageProgress ? Math.round((imageProgress.done / imageProgress.total) * 100) : uploadProgress;

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
            <span>{progressLabel}</span>
            <span>{progressCount}</span>
          </div>
          <Progress value={progressValue} className="w-full" />
        </div>
      )}
    </div>
  );
};
