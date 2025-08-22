'use client';

import { useState } from 'react';
import { ExcelHeaderProps } from '@/types/ExcelInterface';
import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileSpreadsheet, X } from 'lucide-react';

export const ExcelDataPreviewHeader = ({ headerTitle, headerDescription }: ExcelHeaderProps) => {
  const [validCount, setVaildCount] = useState(0);

  const handleClearData = () => {};
  const handleSaveData = () => {};

  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {headerTitle}
          </CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClearData}>
            <X className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSaveData} disabled={validCount === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            저장 ({validCount}개)
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
