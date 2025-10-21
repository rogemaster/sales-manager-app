export interface OrderSearchType {
  dateType: string;
  searchDate: Date[];
  orderStatus: string;
  searchValue: string;
}

export interface OrderStatus {
  id: string;
  name: string;
}
