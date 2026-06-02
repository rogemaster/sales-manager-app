'use client';

import { ExcelHeaderProps, ExcelRowWithErrors, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData, useResetExcelData } from '@/components/excel/store/excelData.store';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { useMutation } from '@tanstack/react-query';
import { useAlert } from '@/hooks/useAlert';

type SaveType = 'PRODUCT' | 'ORDER';
type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: SaveType };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();
  const resetExcelData = useResetExcelData();
  const { showAlert } = useAlert();

  const saveFn = getExcelSaveStrategy(saveType);

  const errorDatas = uploadedData.filter((data) => Array.isArray(data['error']) && data['error'].length > 0);
  const totalCount = uploadedData.length;
  const validCount = totalCount - errorDatas.length;
  const errorCount = errorDatas.length;

  const { mutate: saveExcelData } = useMutation({
    mutationFn: (validData: ExcelRowWithErrors[]) => saveFn(validData),
    onSuccess: (_, validData) => {
      showAlert({
        type: 'success',
        message: `${validData.length}개의 엑셀 데이터가 저장되었습니다.`,
        onConfirm: resetExcelData,
      });
    },
    onError: () => {
      showAlert({
        type: 'error',
        message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    },
  });

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
      />

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
