import { ManipulateType } from 'dayjs';

export interface TableTitleValue {
  id: string;
  title: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface BaseDatePickerProps {
  label?: string;
  name?: string;
}

export type SingleDatePickerProps = BaseDatePickerProps & {
  date: Date;
  onChangeDate: (date: Date, name?: string) => void;
};

export type RangeDatePickerProps = BaseDatePickerProps & {
  date: Date[];
  onChangeDate: (dates: Date[], name?: string) => void;
};

export type RangeTypeProps = {
  range: number;
  uniq: ManipulateType;
};
