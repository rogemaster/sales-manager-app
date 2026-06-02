import { ExcelHeaderProps } from '@/types/excel.type';
import { Download, Upload } from 'lucide-react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const ExcelHeader = ({ excelType, headerTitle, headerDescription }: ExcelHeaderProps) => {
  return (
    <CardHeader className="border-b border-border/50 px-6 py-4">
      <div className="flex items-center gap-2.5">
        <div className="h-4 w-[3px] rounded-full bg-primary" />
        <div>
          <CardTitle className="flex items-center gap-2 text-sm">
            {excelType === 'UPLOAD' ? <Upload className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {headerTitle}
          </CardTitle>
          <CardDescription className="mt-0.5">{headerDescription}</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
};
