import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { getExcelSaveProgressView } from '../utils/getExcelSaveProgressView';

type Props = { open: boolean; progress: { done: number; total: number } | null };

// 저장이 끝날 때까지 사용자가 닫을 수 없다. 오버레이가 사이드바·헤더 클릭까지 막아 앱 안 이동도 함께 막는다.
const preventDefault = (event: Event) => event.preventDefault();

export const ExcelSaveProgressDialog = ({ open, progress }: Props) => {
  const { label, count, value } = getExcelSaveProgressView(progress);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={preventDefault}
        onInteractOutside={preventDefault}
        // 저장 결과 알림이 이 창이 닫히는 도중에 열린다. 포커스를 되돌리면 알림의 포커스를 빼앗는다.
        onCloseAutoFocus={preventDefault}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>엑셀 데이터 저장</DialogTitle>
          <DialogDescription>저장이 끝날 때까지 창을 닫거나 새로고침하지 마세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{label}</span>
            {count && <span>{count}</span>}
          </div>
          <Progress value={value} className="w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
