import { useAlert } from '@/hooks/useAlert';
import { ExcelHeaderProps } from '@/types/excel.type';
import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileSpreadsheet, X } from 'lucide-react';
import { useResetExcelData } from '@/components/excel/store/excelData.store';

type Props = {
  validCount: number;
  onSaveConfirm: () => void;
  // 저장은 이미지 가져오기 때문에 수 초 이상 걸린다. 그동안 다시 누르면 같은 상품이 두 번 등록된다.
  // 진행률은 ExcelSaveProgressDialog가 보여준다.
  isSaving: boolean;
};

export const ExcelDataPreviewHeader = ({
  headerTitle,
  headerDescription,
  validCount,
  onSaveConfirm,
  isSaving,
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
      onConfirm: () => resetExcel(),
    });
  };

  const handleSaveData = async () => {
    showAlert({
      type: 'info',
      message: `${validCount}개 저장하시겠습니까?`,
      showCancel: true,
      confirmText: '저장',
      cancelText: '취소',
      onConfirm: () => onSaveConfirm(),
    });
  };

  const saveLabel = isSaving ? '저장 중...' : `저장 (${validCount}개)`;

  return (
    <CardHeader className="border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              {headerTitle}
            </CardTitle>
            <CardDescription className="mt-0.5">{headerDescription}</CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          {/* 저장 중에 초기화하면 진행 중인 저장과 화면 데이터가 어긋난다 */}
          <Button variant="outline" onClick={handleClearData} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSaveData} disabled={validCount === 0 || isSaving}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {saveLabel}
          </Button>
        </div>
      </div>
    </CardHeader>
  );
};
