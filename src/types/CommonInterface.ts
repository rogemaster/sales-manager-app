import { ManipulateType } from 'dayjs';

// 다이나믹 타입
export interface dynamicType {
  [key: string]: string | number | boolean | object | [] | null | undefined;
}

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

// 공통 alert
export interface CommonAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: AlertOptions | null;
}

// 공통 alert 옵션
export interface AlertOptions {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}
