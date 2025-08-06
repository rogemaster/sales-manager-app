export interface ProductSearch {
  dateType: string;
  registDate: Date;
  updateDate: Date | null;
  saleType: string;
  categoryId: string;
  searchValue: string;
}

export interface ProductTableHead {
  id: string;
  title: string;
}
