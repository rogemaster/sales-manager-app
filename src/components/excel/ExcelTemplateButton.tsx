'use client';

import { FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';

export const ExcelTemplateButton = () => {
  const handleDownloadTemplate = () => {};

  return (
    <Button onClick={handleDownloadTemplate} className="w-full cursor-pointer">
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      엑셀 양식 다운로드
    </Button>
  );
};
