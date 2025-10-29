'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { FilterOption } from '@/types/common.type';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterSelectProps {
  htmlFor?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  allOption?: FilterOption;
  placeholder?: string;
  divClassName?: string;
  labelClassName?: string;
  triggerClassName?: string;
}

export const FilterSelect = ({
  htmlFor,
  label,
  value,
  onValueChange,
  options,
  allOption,
  placeholder,
  divClassName,
  labelClassName,
  triggerClassName,
}: FilterSelectProps) => {
  // 필터 옵션을 메모이제이션
  const filterOptions = useMemo(() => {
    if (allOption) {
      return [allOption, ...options];
    } else {
      return options;
    }
  }, [allOption, options]);

  // 현재 선택된 옵션 정보를 메모이제이션
  const selectedOptionInfo = useMemo(() => {
    if (value === 'ALL') {
      return allOption;
    }
    return options.find((option) => option.id && option.id === value);
  }, [value, options, allOption]);

  return (
    <div className={divClassName}>
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder || selectedOptionInfo?.name} />
        </SelectTrigger>
        <SelectContent>
          {filterOptions.map((option) => (
            <SelectItem key={option.id} value={option.id || ''}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
