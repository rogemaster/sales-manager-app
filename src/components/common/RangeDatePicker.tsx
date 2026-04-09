'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { RangeDatePickerProps } from '@/types/common.type';
import { CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';

export const RangeDatePicker = ({
  label,
  onChangeDate,
  initStartDate,
  initEndDate,
  resetKey,
}: RangeDatePickerProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startDateValue, setStartDateValue] = useState<string>(initStartDate);
  const [endDateValue, setEndDateValue] = useState<string>(initEndDate);

  useEffect(() => {
    setStartDateValue(initStartDate);
    setEndDateValue(initEndDate);
  }, [resetKey, initStartDate, initEndDate]);

  const onSelectDate = (date: Date | undefined, type: string) => {
    if (!date) {
      return;
    }
    const selectDate: string = dayjs(date).format('YYYY-MM-DD');
    const nextStartDate = type === 'start' ? selectDate : startDateValue;
    const nextEndDate = type === 'end' ? selectDate : endDateValue;

    if (type === 'start') {
      setStartDateValue(selectDate);
      setStartOpen(false);
    } else {
      setEndDateValue(selectDate);
      setEndOpen(false);
    }

    onChangeDate(nextStartDate, nextEndDate);
  };

  return (
    <div className="flex flex-row gap-3">
      {/* 시작일 */}
      {label && (
        <Label htmlFor="date" className="px-1">
          Date of birth
        </Label>
      )}
      <Popover open={startOpen} onOpenChange={setStartOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" id="date" className="w-48 justify-start font-normal">
            <CalendarIcon />
            {startDateValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={dayjs(startDateValue).toDate()}
            captionLayout="dropdown"
            onSelect={(date) => onSelectDate(date, 'start')}
          />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground content-center">~</span>

      {/* 종료일 */}
      {label && (
        <Label htmlFor="date" className="px-1">
          Date of birth
        </Label>
      )}
      <Popover open={endOpen} onOpenChange={setEndOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" id="date" className="w-48 justify-start font-normal">
            <CalendarIcon />
            {endDateValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={dayjs(endDateValue).toDate()}
            captionLayout="dropdown"
            onSelect={(date) => onSelectDate(date, 'end')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
