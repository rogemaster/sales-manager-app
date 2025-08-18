import { ExcelHeaderProps } from '@/types/ExcelInterface';
import { Download, Upload } from 'lucide-react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const ExcelHeader = ({ excelType, headerTitle: title, headerDescription }: ExcelHeaderProps) => {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {excelType === 'UPLOAD' ? <Upload className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        {title}
      </CardTitle>
      <CardDescription>{headerDescription}</CardDescription>
    </CardHeader>
  );
};
