'use client';

import { ExcelHeaderProps, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData } from '@/components/excel/store/excelData.store';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';

type saveTypes = 'PRODUCT' | 'ORDER';
type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: saveTypes };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();

  const strategy = getExcelSaveStrategy(saveType);

  const errorDatas = uploadedData.filter((data) => Array.isArray(data['error']) && data['error'].length > 0);

  const totalCount = uploadedData.length;
  const validCount = totalCount - errorDatas.length;
  const errorCount = errorDatas.length;

  const handleExcelSaveData = async () => {
    try {
      const validData = uploadedData.filter(
        (row) => !Array.isArray(row['error']) || row['error'].length === 0,
      );
      await strategy(validData);
    } catch (error) {
      console.error('저장 중 오류가 발생했습니다.', error);
    }
  };

  return (
    <Card>
      <ExcelDataPreviewHeader
        headerTitle={excelHeader.headerTitle}
        headerDescription={excelHeader.headerDescription}
        validCount={validCount}
        onSaveConfirm={handleExcelSaveData}
      />

      <CardContent>
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
