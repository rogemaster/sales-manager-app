'use client';

import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { ExcelHeaderProps, ExcelRowWithErrors, ExcelSaveType, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { formatExcelFailureSummary } from './utils/formatExcelFailureSummary';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData, useResetExcelData } from '@/components/excel/store/excelData.store';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { ExcelSaveProgressDialog } from './components/ExcelSaveProgressDialog';
import { useMutation } from '@tanstack/react-query';
import { useAlert } from '@/hooks/useAlert';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getErrorMessage } from '@/shared/utils/errorMessage';

type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: ExcelSaveType };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();
  const resetExcelData = useResetExcelData();
  const { showAlert } = useAlert();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);

  const saveFn = getExcelSaveStrategy(saveType, workspaceOwnerId);

  const errorDatas = uploadedData.filter((data) => Array.isArray(data['error']) && data['error'].length > 0);
  const totalCount = uploadedData.length;
  const validCount = totalCount - errorDatas.length;
  const errorCount = errorDatas.length;

  const { mutate: saveExcelData, isPending: isSaving } = useMutation({
    mutationFn: (validData: ExcelRowWithErrors[]) =>
      saveFn(validData, { onProgress: (done, total) => setSaveProgress({ done, total }) }),
    onSuccess: ({ savedCount, failures }) => {
      const savedMessage = `${savedCount}개의 엑셀 데이터가 저장되었습니다.`;
      // 이미지를 가져오지 못한 행은 빼고 저장했다. 첫 오류와 나머지 건수만 알린다.
      showAlert({
        type: failures.length > 0 ? 'warning' : 'success',
        message: failures.length > 0 ? `${savedMessage} ${formatExcelFailureSummary(failures)}` : savedMessage,
        onConfirm: resetExcelData,
      });
    },
    // 서버가 이유를 담아 보낸 경우(예: 몇 번째 행의 값이 잘못됐는지) 그대로 보여준다. 미리보기는 초기화하지 않는다.
    onError: (error) => {
      showAlert({
        type: 'error',
        message: getErrorMessage(error, '저장 중 오류가 발생했습니다. 다시 시도해주세요.'),
      });
    },
    onSettled: () => setSaveProgress(null),
  });

  // 모달은 탭 닫기·새로고침을 막지 못한다. 이미지를 반쯤 받고 떠나면 상품 없는 R2 파일이 남는다.
  useEffect(() => {
    if (!isSaving) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSaving]);

  const handleExcelSaveData = () => {
    const validData = uploadedData.filter((row) => !Array.isArray(row['error']) || row['error'].length === 0);
    saveExcelData(validData);
  };

  return (
    <Card className="overflow-hidden">
      <ExcelDataPreviewHeader
        headerTitle={excelHeader.headerTitle}
        headerDescription={excelHeader.headerDescription}
        validCount={validCount}
        onSaveConfirm={handleExcelSaveData}
        isSaving={isSaving}
      />
      <ExcelSaveProgressDialog open={isSaving} progress={saveProgress} />

      <CardContent className="pt-6">
        {/* 요약 정보 */}
        <ExcelDataSummaryInfo totalCount={totalCount} validCount={validCount} errorCount={errorCount} />

        {/* 오류 알림 */}
        {errorCount > 0 && <ExcelDataErrorAlert errorCount={errorCount} />}

        {/* 데이터 테이블 */}
        <ExcelDataTable uploadedData={uploadedData} tableColumns={tableColumns} />
      </CardContent>
    </Card>
  );
};
