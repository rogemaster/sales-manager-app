'use client';

import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { RangeDatePickerProps } from '@/types/common.type';
import { CalendarIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';

export const RangeDatePicker = ({ label, onChangeDate, name, date }: RangeDatePickerProps) => {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectDate, setSelectDate] = useState<Date[]>(date);

  useEffect(() => {
    setSelectDate(date);
    onChangeDate(date);
  }, [date, onChangeDate]);

  const onSelectDate = (value: Date | undefined, type: string) => {
    let newRangeDate: Date[] = [];

    if (type === 'start') {
      newRangeDate = [value!, selectDate[1]];
      setStartOpen(false);
    } else {
      newRangeDate = [selectDate[0], value!];
      setEndOpen(false);
    }

    setSelectDate(newRangeDate);
    onChangeDate(newRangeDate, name);
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
            {dayjs(selectDate[0]).format('YYYY-MM-DD')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectDate[0]}
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
            {dayjs(selectDate[1]).format('YYYY-MM-DD')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectDate[1]}
            captionLayout="dropdown"
            onSelect={(date) => onSelectDate(date, 'end')}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
