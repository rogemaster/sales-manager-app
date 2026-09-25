import { ManipulateType } from 'dayjs';
import type { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

export interface TableTitleValue {
  id: string;
  title: string;
  width?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface BaseDatePickerProps {
  label?: string;
  name?: string;
}

export type RangeDatePickerProps = BaseDatePickerProps & {
  initStartDate: string;
  initEndDate: string;
  resetKey?: number;
  onChangeDate: (startDate: string, endDate: string) => void;
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

export interface ShoppingMallType {
  code: string;
  name: string;
}

// 쇼핑몰 코드 — SHOPPING_MALLS 배열에서 파생한다(몰 추가는 배열 한 곳만 고친다)
export type ShoppingMalls = (typeof SHOPPING_MALLS)[number]['code'];

// 필터 관련 타입들
export interface FilterOption {
  id: string;
  name: string;
}

/**
 * 목록 API 응답의 페이징 정보.
 * 각 도메인 응답은 이걸 extends 하고 데이터 배열 필드만 자기 이름으로 선언한다.
 * (`TablePagination`이 기대하는 형태이기도 하다)
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
