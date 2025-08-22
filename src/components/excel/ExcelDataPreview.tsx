import { ExcelPreviewProps } from '@/types/ExcelInterface';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { ExcelDataTable } from './components/ExcelDataTable';

export const ExcelDataPreview = <T extends Record<string, unknown>>({
  excelHeader,
  tableColumns,
  uploadedData,
  getRowKey,
  getRowClassName,
  getValidCount,
  getErrorCount,
}: ExcelPreviewProps<T>) => {
  const validCount = getValidCount?.(uploadedData) ?? 0;
  const errorCount = getErrorCount?.(uploadedData) ?? 0;

  return (
    <Card>
      <ExcelDataPreviewHeader headerTitle={excelHeader.headerTitle} headerDescription={excelHeader.headerDescription} />

      <CardContent>
        {/* 요약 정보 */}
        <ExcelDataSummaryInfo
          uploadedData={uploadedData as unknown[]}
          validCount={validCount}
          errorCount={errorCount}
        />

        {/* 오류 알림 */}
        {errorCount > 0 && <ExcelDataErrorAlert errorCount={errorCount} />}

        {/* 데이터 테이블 */}
        <ExcelDataTable
          tableColumns={tableColumns}
          uploadedData={uploadedData}
          getRowClassName={getRowClassName}
          getRowKey={getRowKey}
        />
      </CardContent>
    </Card>
  );
};
