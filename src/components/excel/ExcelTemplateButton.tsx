'use client';

// import XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '../ui/button';

type Props = {
  onClick: () => void;
};

export const ExcelTemplateButton = ({ onClick }: Props) => {
  return (
    <Button onClick={onClick} className="w-full cursor-pointer">
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      엑셀 양식 다운로드
    </Button>
  );
};
