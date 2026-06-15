export interface ShoppingAccount {
  id: string;
  mallName: string;
  mallId: string;
  password: string;
  isActive: boolean;
  nickname: string;
  managerMd: string;
  phone: string;
  email: string;
  domain: string;
  category: string;
  apiKey: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingAccountSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  isActive: 'true' | 'false' | 'ALL';
  mallName: string;
  searchValue: string;
}

export interface GetShoppingAccountsResponse {
  accounts: ShoppingAccount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CreateShoppingAccountBody = Omit<ShoppingAccount, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingAccountBody = Partial<CreateShoppingAccountBody>;
