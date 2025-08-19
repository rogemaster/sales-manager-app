import { ExcelPreviewProps } from '@/types/ExcelInterface';
import { Card, CardContent } from '../ui/card';
import { ExcelDataPreviewHeader } from './components/ExcelDataPreviewHeader';
import { ExcelDataSummaryInfo } from './components/ExcelDataSummaryInfo';
import { ExcelDataErrorAlert } from './components/ExcelDataErrorAlert';
import { ExcelDataTable } from './components/ExcelDataTable';

export const ExcelDataPreview = ({ excelHeader }: ExcelPreviewProps) => {
  return (
    <Card>
      <ExcelDataPreviewHeader headerTitle={excelHeader.headerTitle} headerDescription={excelHeader.headerDescription} />

      <CardContent>
        {/* 요약 정보 */}
        <ExcelDataSummaryInfo uploadedData={[]} validCount={0} errorCount={0} />

        {/* 오류 알림 */}
        {errorCount > 0 && <ExcelDataErrorAlert errorCount={errorCount} />}

        {/* 데이터 테이블 */}
        <ExcelDataTable uploadedData={[]} />
      </CardContent>
    </Card>
  );
};
