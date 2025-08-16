'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { FilterOption } from '@/features/products/types/ProductTypes';

interface FilterSelectProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  allOption: FilterOption;
  placeholder?: string;
  className?: string;
}

export const FilterSelect = ({
  label,
  value,
  onValueChange,
  options,
  allOption,
  placeholder,
  className = 'w-48',
}: FilterSelectProps) => {
  // 필터 옵션을 메모이제이션
  const filterOptions = useMemo(() => {
    return [allOption, ...options];
  }, [allOption, options]);

  // 현재 선택된 옵션 정보를 메모이제이션
  const selectedOptionInfo = useMemo(() => {
    if (value === 'ALL') {
      return allOption;
    }
    return options.find((option) => (option.id && option.id === value) || allOption);
  }, [value, options, allOption]);

  return (
    <div className="flex items-center gap-4">
      <Label className="w-20 text-right">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}>
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
