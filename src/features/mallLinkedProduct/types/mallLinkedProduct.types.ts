import { Product, ProductStateType } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { PaginationMeta, ShoppingMalls } from '@/types/common.type';

export type MallLinkStatus = 'success' | 'failed';

/**
 * 쇼핑몰 연동 데이터.
 * 오리지널 상품(Product)/설정(ShoppingSetting)과 별개의 독립 데이터이며,
 * 전송 시점의 값을 스냅샷으로 복사해 보유한다. 오리지널을 수정해도 이 값은 바뀌지 않는다.
 * 연동 데이터 1건 = 외부 쇼핑몰 상품 1개.
 */
export interface MallLinkedProduct {
  // ── 불변 식별 정보 ──
  id: string;
  ownerId: string;
  sourceProductId: string; // 파생된 오리지널 상품 (값 동기화 없음, 추적용)
  sourceShoppingSettingId: string; // 파생된 오리지널 설정 (값 동기화 없음, 추적용)
  mallCode: ShoppingMalls;

  // ── 연동 결과 ──
  status: MallLinkStatus;
  externalProductId?: string; // 성공 시 외부몰이 부여한 쇼핑몰 상품코드
  errorMessage?: string; // 실패 사유

  // ── 스냅샷 (이 연동 데이터의 실제 값) ──
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;

  // ── 로그 ──
  createdByEmail: string;
  updatedByEmail?: string; // 수정 기능 도입 전까지는 비어 있음
  createdAt: string; // 연동 데이터 최초 생성 시각
  lastSentAt: string; // 최종 전송(연동) 시각 — 화면의 '최종연동일시'
  updatedAt: string; // 마지막 수정 시각 (updatedByEmail과 짝)
}

export type MallLinkedProductSearchType =
  | 'productName'
  | 'productCode'
  | 'externalProductCode'
  | 'createdBy'
  | 'updatedBy';

export interface MallLinkedProductSearch {
  dateType: 'lastSentAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  shoppingSettingId: string; // 'ALL' 또는 ShoppingSetting.id
  linkStatus: MallLinkStatus | 'ALL';
  saleState: ProductStateType | 'ALL';
  searchType: MallLinkedProductSearchType;
  searchValue: string;
}

export interface GetMallLinkedProductsResponse extends PaginationMeta {
  linkedProducts: MallLinkedProduct[];
}

/** 전송 요청 1건 — 어떤 상품을 어떤 몰·설정으로 보낼지 */
export interface MallLinkedProductRequestItem {
  productId: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
}

export interface CreateMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}

export interface UpdateMallLinkedProductBody {
  updatedByEmail: string;
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;
}

export interface ResendMallLinkedProductsBody {
  ownerId: string;
  ids: string[];
}

/** CreateMallLinkedProductsResult와 구조가 같지만 의미가 다르고 한쪽만 바뀔 수 있어 합치지 않는다. */
export interface ResendMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}
