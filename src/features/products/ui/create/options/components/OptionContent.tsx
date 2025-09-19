import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProductOptionDraft } from '@/features/products/types/ProductTypes';

type Props = {
  type: 'basic' | 'sub';
  isOptionsConfirmed: boolean;
  options: ProductOptionDraft[];
  onOptionNameChange: (optionId: string, optionName: string) => void;
  onOptionValueChange: (optionId: string, value: string) => void;
  onRemoveOption: (optionId: string) => void;
};

export const OptionContent = ({
  type,
  isOptionsConfirmed,
  options,
  onOptionNameChange,
  onOptionValueChange,
  onRemoveOption,
}: Props) => {
  return (
    <CardContent className="space-y-4">
      {!isOptionsConfirmed ? (
        <>
          {options.map((option) => (
            <div key={option.id} className="p-4 border rounded-lg space-y-3">
              {/* 옵션명 설정 Input */}
              <div className="flex items-center justify-between">
                <Input
                  placeholder={type === 'basic' ? '옵션 (예: 색상)' : '추가옵션 (예: 추가제품)'}
                  value={option.name}
                  onChange={(e) => onOptionNameChange(option.id, e.target.value)}
                  className="flex-1 mr-2"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveOption(option.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 옵션값 설정 Input */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={type === 'basic' ? '옵션 (예: 90, 100, 110)' : '추가옵션 (예: 90, 100, 110)'}
                    value={option.values}
                    onChange={(e) => onOptionValueChange(option.id, e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {type === 'basic' ? '옵션' : '추가옵션'}을 추가하세요.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            설정된 {type === 'basic' ? '옵션' : '추가옵션'}:{' '}
            {/* {options.map((opt) => `${opt.name}(${opt.values.filter((v) => v.trim()).length}개)`).join(', ')} */}
          </div>
        </div>
      )}
    </CardContent>
  );
};
