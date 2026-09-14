import { Product } from '../types/product.types';
import { formatBulkRowError } from '../util/bulkRowError';

// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
// rowNumbers는 data와 같은 순서의 엑셀 시트 행 번호다. 서버가 돌려준 rowIndex를 시트 행으로 바꿔
// "[4행] 사유" 형태로 오류를 만든다.
export const bulkCreateProducts = async (
  data: Omit<Product, 'ownerId'>[],
  _ownerId: string,
  rowNumbers: readonly number[],
) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products: data }),
  });

  // 서버 사유를 고정 문구로 덮지 않는다.
  if (!response.ok) {
    const { error, rowIndex } = (await response.json().catch(() => ({}))) as { error?: string; rowIndex?: unknown };
    throw new Error(error ? formatBulkRowError(error, rowIndex, rowNumbers) : '상품 대량 등록 실패');
  }

  return response.json() as Promise<{ success: boolean; count: number }>;
};
