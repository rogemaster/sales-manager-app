'use client';

import { ExcelDownloaderProps } from '@/types/excel.type';
import { ExcelTemplateButton } from './ExcelTemplateButton';
import { ExcelTemplateInfo } from './ExcelTemplateInfo';
import { Card, CardContent } from '../ui/card';
import { ExcelHeader } from './components/ExcelHeader';
import { excelDownload } from '@/components/excel/utils/excelDownload';

export const ExcelDownloader = ({
  excelHeader,
  isTemplateInfo,
  templateInfo,
  templateHeaders,
  templateName = '상품등록',
}: ExcelDownloaderProps) => {
  const { downloadTemplate } = excelDownload(templateHeaders || [], templateName);

  const handleDownload = () => {
    if (templateInfo) {
      downloadTemplate(); // 사용 화면별 이름 주입
    }
  };

  return (
    <Card>
      <ExcelHeader
        excelType={excelHeader.excelType}
        headerTitle={excelHeader.headerTitle}
        headerDescription={excelHeader.headerDescription}
      />
      <CardContent>
        {/* 엑셀 양식 다운로드 버튼 */}
        <ExcelTemplateButton onClick={handleDownload} />
        {isTemplateInfo && templateInfo && (
          <ExcelTemplateInfo templateTitle={templateInfo?.templateTitle} template={templateInfo?.template} />
        )}
      </CardContent>
    </Card>
  );
};
