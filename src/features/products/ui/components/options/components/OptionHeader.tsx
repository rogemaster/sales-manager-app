import { Button } from '@/components/ui/button';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

type Props = {
  type: 'basic' | 'sub';
  onAddOption: () => void;
  onConfirmOptions: () => void;
  onResetOptions: () => void;
  isOptionsConfirmed: boolean;
};

export const OptionHeader = ({ type, onAddOption, isOptionsConfirmed, onConfirmOptions, onResetOptions }: Props) => {
  return (
    <CardHeader className="border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <div>
            <CardTitle className="text-sm">{type === 'basic' ? '옵션' : '추가옵션'}</CardTitle>
            <CardDescription className="mt-0.5">상품의 {type === 'basic' ? '옵션' : '추가'} 옵션을 설정하세요.</CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          {!isOptionsConfirmed ? (
            <>
              <Button type="button" size="sm" onClick={onAddOption}>
                <Plus className="h-4 w-4 mr-2" />
                {type === 'basic' ? '옵션' : '추가'} 추가
              </Button>
              <Button type="button" size="sm" onClick={onConfirmOptions} variant="default">
                확정
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={onResetOptions} variant="outline">
              재설정
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  );
};
