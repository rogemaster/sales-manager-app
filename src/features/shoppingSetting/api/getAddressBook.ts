import { MallAddress } from '../types/shoppingSetting.types';

export type MallAddressType = 'SHIPPING' | 'RETURN';

export const getAddressBook = async (mallAccountId: string, addressType: MallAddressType): Promise<MallAddress[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mallAccountId, addressType }),
  });
  if (!response.ok) {
    // 서버가 사유를 구분해 준다(계정 없음 404 / 인증 실패·조회 실패 502). 고정 문구로 덮지 않는다.
    const { error } = (await response.json().catch(() => ({ error: '' }))) as { error?: string };
    throw new Error(error || '주소록 조회 실패');
  }
  return response.json();
};
