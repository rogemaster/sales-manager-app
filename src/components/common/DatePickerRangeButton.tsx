import { Button } from '../ui/button';
import { RangeTypeProps } from '@/types/CommonInterface';

type Props = {
  onChangeDateRange: (value: RangeTypeProps) => void;
};

export const DatePickerRangeButton = ({ onChangeDateRange }: Props) => {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChangeDateRange({ range: 7, uniq: 'day' })}
        className="text-xs"
      >
        7일
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChangeDateRange({ range: 15, uniq: 'day' })}
        className="text-xs"
      >
        15일
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChangeDateRange({ range: 30, uniq: 'day' })}
        className="text-xs"
      >
        30일
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChangeDateRange({ range: 1, uniq: 'year' })}
        className="text-xs"
      >
        1년
      </Button>
    </div>
  );
};
