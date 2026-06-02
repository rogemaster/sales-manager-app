import { ExcelUploaderProps } from '@/types/excel.type';
import { Card, CardContent } from '../ui/card';
import { ExcelHeader } from './components/ExcelHeader';
import { ExcelUploaderContent } from './ExcelUploaderContent';

export const ExcelUploader = ({ excelHeader, contentDescription, fileTemplateInfo }: ExcelUploaderProps) => {
  return (
    <Card className="overflow-hidden">
      <ExcelHeader
        excelType={excelHeader.excelType}
        headerTitle={excelHeader.headerTitle}
        headerDescription={excelHeader.headerDescription}
      />
      <CardContent className="pt-6">
        <ExcelUploaderContent contentDescription={contentDescription} fileTemplateInfo={fileTemplateInfo} />
      </CardContent>
    </Card>
  );
};
