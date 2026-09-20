import { PaginationMeta, ShoppingMalls } from '@/types/common.type';

/**
 * 브라우저로 내려가는 모양. password·apiKey가 타입에 없다.
 * 키는 등록 시 한 번 들어가고 이후 외부몰 전송(실행 순서 4)에서 서버만 읽는다.
 */
export interface ShoppingAccount {
  id: string;
  ownerId: string;
  mallCode: ShoppingMalls;
  mallId: string;
  isActive: boolean;
  nickname: string;
  managerMd: string;
  phone: string;
  email: string;
  domain: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingAccountSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  isActive: 'true' | 'false' | 'ALL';
  mallCode: ShoppingMalls | 'ALL';
  searchValue: string;
}

export interface GetShoppingAccountsResponse extends PaginationMeta {
  accounts: ShoppingAccount[];
}

/** 쓰기 전용. 비밀 필드는 이 타입 계열에만 있다. */
export type CreateShoppingAccountBody = Omit<ShoppingAccount, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> & {
  password: string;
  apiKey: string;
};

/** password·apiKey가 빈 문자열이면 서버가 무시한다(기존 값 유지). */
export type UpdateShoppingAccountBody = Partial<CreateShoppingAccountBody>;

export interface MallAccountOption {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
}

/** 대량 삭제·사용여부 변경의 건별 결과. 일부 성공이 정상 결과다(엑셀 ExcelSaveResult와 같은 모양). */
export interface BulkAccountFailure {
  id: string;
  message: string;
}

export interface BulkAccountResult {
  successCount: number;
  failures: BulkAccountFailure[];
}
