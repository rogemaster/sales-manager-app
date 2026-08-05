import { ShoppingMalls } from '@/types/common.type';

/**
 * 모달에서 고른 (몰, 설정) 조합 — 전송 전까지만 존재하는 화면 임시 상태.
 * 서버로 보내는 요청 형태는 `MallLinkedProductRequestItem`(mallLinkedProduct)을 쓴다.
 */
export interface StagedRegistration {
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  nickname: string;
}
