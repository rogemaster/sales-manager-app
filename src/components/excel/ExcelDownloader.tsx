import { ExcelDownloaderProps } from '@/types/ExcelInterface';
import { ExcelTemplateButton } from './ExcelTemplateButton';
import { ExcelTemplateInfo } from './ExcelTemplateInfo';
import { Card, CardContent } from '../ui/card';
import { ExcelHeader } from './components/ExcelHeader';

export const ExcelDownloader = ({ excelHeader, isTemplateInfo, templateInfo }: ExcelDownloaderProps) => {
  return (
    <Card>
      <ExcelHeader
        excelType={excelHeader.excelType}
        headerTitle={excelHeader.headerTitle}
        headerDescription={excelHeader.headerDescription}
      />
      <CardContent>
        {/* 엑셀 양식 다운로드 버튼 */}
        <ExcelTemplateButton />
        {isTemplateInfo && templateInfo && (
          <ExcelTemplateInfo templateTitle={templateInfo?.templateTitle} template={templateInfo?.template} />
        )}
      </CardContent>
    </Card>
  );
};
