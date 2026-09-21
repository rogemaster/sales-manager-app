import { MallAddress } from '../types/shoppingSetting.types';

/**
 * 네이버 시뮬레이터의 주소록 응답을 우리 MallAddress로 옮긴다.
 *
 * 다른 것은 이름이 같고 식별자만 다르다 — 시뮬레이터의 addressId가 우리 code다.
 * 이 값이 곧 설정에 저장되고, 순서 4의 전송에서 시뮬레이터가 실재를 검증하는 값이 된다.
 *
 * 응답은 외부(우리 앱이 아닌 것으로 취급하는 시스템)에서 오므로 모양을 믿지 않는다.
 */
export const toMallAddresses = (response: unknown): MallAddress[] => {
  if (typeof response !== 'object' || response === null) return [];
  const { addresses } = response as { addresses?: unknown };
  if (!Array.isArray(addresses)) return [];

  return addresses.flatMap((item): MallAddress[] => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    if (typeof row.addressId !== 'string' || row.addressId === '') return [];

    return [
      {
        code: row.addressId,
        name: typeof row.name === 'string' ? row.name : '',
        zipCode: typeof row.zipCode === 'string' ? row.zipCode : '',
        address: typeof row.address === 'string' ? row.address : '',
        addressDetail: typeof row.addressDetail === 'string' ? row.addressDetail : '',
      },
    ];
  });
};
