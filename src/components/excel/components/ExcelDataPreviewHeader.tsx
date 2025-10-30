import { useAlert } from '@/hooks/useAlert';
import { ExcelHeaderProps } from '@/types/excel.type';
import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileSpreadsheet, X } from 'lucide-react';
import { useResetExcelData } from '@/components/excel/store/excelData.store';

type Props = { validCount: number; onSaveConfirm: () => void };

export const ExcelDataPreviewHeader = ({
  headerTitle,
  headerDescription,
  validCount,
  onSaveConfirm,
}: ExcelHeaderProps & Props) => {
  const { showAlert } = useAlert();

  const resetExcel = useResetExcelData();

  const handleClearData = () => {
    showAlert({
      type: 'info',
      message: '업로드된 모든 데이터가 삭제됩니다. 계속하시겠습니까?',
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => {
        resetExcel();
      },
    });
  };

  const handleSaveData = async () => {
    showAlert({
      type: 'info',
      message: `${validCount}개 저장하시겠습니까?`,
      showCancel: true,
      confirmText: '저장',
      cancelText: '취소',
      onConfirm: () => {
        onSaveConfirm();
      },
    });
  };

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
          <Button onClick={handleSaveData} disabled={validCount > 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            저장 ({validCount}개)
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
