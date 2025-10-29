'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import dayjs from 'dayjs';
import { SingleDatePickerProps } from '@/types/common.type';

export const SingleDatePicker = ({ label, onChangeDate, name, date }: SingleDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [selectDate, setSelectDate] = useState<Date>(date || new Date());

  const onSelectDate = (value: Date | undefined) => {
    if (value) {
      setSelectDate(value);
    }
    onChangeDate!(selectDate, name);
  };

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <Label htmlFor="date" className="px-1">
          Date of birth
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" id="date" className="w-48 justify-start font-normal">
            <CalendarIcon />
            {dayjs(date).format('YYYY-MM-DD')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectDate}
            captionLayout="dropdown"
            onSelect={(date) => onSelectDate(date)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
