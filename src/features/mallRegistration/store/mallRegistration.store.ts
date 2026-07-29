import { atom } from 'jotai';
import { StagedRegistration } from '../types/mallRegistration.types';

export const selectedProductIdsAtom = atom<string[]>([]);
export const isRegisterModalOpenAtom = atom<boolean>(false);

// productId -> 스테이징된 (몰, 설정) 조합 목록. 서버에 저장되지 않는 화면 임시 상태.
export const stagedRegistrationsAtom = atom<Record<string, StagedRegistration[]>>({});

export const stagedCountAtom = atom((get) =>
  Object.values(get(stagedRegistrationsAtom)).reduce((sum, list) => sum + list.length, 0),
);

// 모달 완료 시 선택된 상품 전체에 스테이징 항목을 append. 동일 (몰,설정) 조합 중복 추가는 무시한다.
export const addStagedRegistrationsAtom = atom(
  null,
  (get, set, params: { productIds: string[]; registrations: StagedRegistration[] }) => {
    const current = get(stagedRegistrationsAtom);
    const next = { ...current };

    params.productIds.forEach((productId) => {
      const existing = next[productId] ?? [];
      const merged = [...existing];
      params.registrations.forEach((reg) => {
        const isDuplicate = merged.some(
          (item) => item.mallCode === reg.mallCode && item.shoppingSettingId === reg.shoppingSettingId,
        );
        if (!isDuplicate) merged.push(reg);
      });
      next[productId] = merged;
    });

    set(stagedRegistrationsAtom, next);
  },
);

// 배지 개별 취소 (전송 전)
export const removeStagedRegistrationAtom = atom(
  null,
  (get, set, params: { productId: string; mallCode: string; shoppingSettingId: string }) => {
    const current = get(stagedRegistrationsAtom);
    const list = current[params.productId] ?? [];
    const filtered = list.filter(
      (item) => !(item.mallCode === params.mallCode && item.shoppingSettingId === params.shoppingSettingId),
    );
    set(stagedRegistrationsAtom, { ...current, [params.productId]: filtered });
  },
);

export const resetMallRegistrationStateAtom = atom(null, (_, set) => {
  set(stagedRegistrationsAtom, {});
  set(selectedProductIdsAtom, []);
  set(isRegisterModalOpenAtom, false);
});
