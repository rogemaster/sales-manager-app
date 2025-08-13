'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import dayjs from 'dayjs';

type Props = {
  label?: string;
  name: string;
  onChangeDate: (date: Date, name: string) => void;
};

export const CommonDatePicker = ({ label, onChangeDate, name }: Props) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  const onSelectDate = (selectDate: Date | undefined) => {
    if (selectDate) {
      setDate(selectDate);
    }
    onChangeDate(date, name);
    setOpen(false);
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
          <Calendar mode="single" selected={date} captionLayout="dropdown" onSelect={(date) => onSelectDate(date)} />
        </PopoverContent>
      </Popover>
    </div>
  );
};
