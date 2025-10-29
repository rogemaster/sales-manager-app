'use client';

import { ExcelHeaderProps, ExcelTableColumnsType } from '@/types/excel.type';
import { getExcelSaveStrategy } from './utils/getExcelSaveStrategy';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataTable } from './components/ExcelDataTable';
import { useExcelData } from '@/components/excel/store/excelDataStore';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';

type saveTypes = 'PRODUCT' | 'ORDER';
type Props = { excelHeader: ExcelHeaderProps; tableColumns: ExcelTableColumnsType[]; saveType: saveTypes };

export const ExcelDataPreview = ({ excelHeader, tableColumns, saveType }: Props) => {
  const uploadedData = useExcelData();

  const strategy = getExcelSaveStrategy(saveType);

  // Property 'length' does not exist on type 'string | number | boolean | ValidationError[]'.
  // Property 'length' does not exist on type 'number'.
  const errorDatas = uploadedData.filter((data) => Array.isArray(data['error']) && data['error'].length > 0);

  const totalCount = uploadedData ? uploadedData.length : 0;
  const validCount = totalCount - errorDatas.length || 0;
  const errorCount = errorDatas.length || 0;

  const handleExcelSaveData = () => {
    strategy.processData(uploadedData);
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
