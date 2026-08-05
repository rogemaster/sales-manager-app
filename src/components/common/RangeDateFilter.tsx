'use client';

import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RangeDatePicker } from '@/components/common/RangeDatePicker';
import { DatePickerRangeButton } from '@/components/common/DatePickerRangeButton';
import { calculatorRangeDate } from '@/lib/utils';
import { FilterOption, RangeTypeProps } from '@/types/common.type';

type DateTypeSelect = {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type Props = {
  /** 시작·종료일이 확정될 때 호출된다 (달력 선택·기간 버튼 공통). */
  onChangeDate: (startDate: string, endDate: string) => void;
  /**
   * 검색 기준일 Select. 기준일이 하나뿐인 화면(주문수집 등)은 생략한다.
   * 값·옵션·핸들러가 항상 함께 필요해 개별 prop으로 흩지 않고 하나로 묶었다.
   */
  dateType?: DateTypeSelect;
  label?: string;
};

/**
 * 목록 화면의 "검색 일자" 행 — 기준일 Select + 기간 달력 + 기간 단축 버튼.
 *
 * 각 도메인 필터가 atom만 연결하면 되도록 배선을 여기로 모았다.
 * (이전에는 이 컴포넌트 전체가 7개 화면에 복사돼 있었다)
 */
export const RangeDateFilter = ({ onChangeDate, dateType, label = '검색 일자' }: Props) => {
  const defaultStartDate = useMemo(() => dayjs().subtract(7, 'day').format('YYYY-MM-DD'), []);
  const defaultEndDate = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const [pickerInitDate, setPickerInitDate] = useState({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [resetKey, setResetKey] = useState(0);

  const handleChangeDateRange = useCallback(
    (value: RangeTypeProps) => {
      const [startDate, endDate] = calculatorRangeDate(value);
      const formatStartDate = dayjs(startDate).format('YYYY-MM-DD');
      const formatEndDate = dayjs(endDate).format('YYYY-MM-DD');

      // RangeDatePicker는 init 날짜를 내부 state로 복사해 두고 resetKey 변화를 재동기화 신호로 쓴다.
      // 기간 버튼으로 값을 바꿀 때는 날짜와 resetKey를 반드시 함께 갱신해야 달력 표시가 따라온다.
      setPickerInitDate({ startDate: formatStartDate, endDate: formatEndDate });
      setResetKey((prev) => prev + 1);
      onChangeDate(formatStartDate, formatEndDate);
    },
    [onChangeDate],
  );

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 shrink-0 text-right">{label}</Label>
      {dateType && (
        <Select value={dateType.value} onValueChange={dateType.onChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateType.options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <RangeDatePicker
        initStartDate={pickerInitDate.startDate}
        initEndDate={pickerInitDate.endDate}
        resetKey={resetKey}
        onChangeDate={onChangeDate}
      />
      <DatePickerRangeButton onChangeDateRange={handleChangeDateRange} />
    </div>
  );
};
