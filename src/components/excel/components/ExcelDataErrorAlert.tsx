import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

type Props = { errorCount: number };

export const ExcelDataErrorAlert = ({ errorCount }: Props) => {
  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {errorCount}개의 데이터에 오류가 있습니다. 오류를 수정한 후 다시 업로드하거나, 유효한 데이터만 저장할 수
        있습니다.
      </AlertDescription>
    </Alert>
  );
};
