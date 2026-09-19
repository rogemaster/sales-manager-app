import type { NaverRepository } from './repository';
import type { InvalidInput, NaverDeliveryInfo, NaverProductRequest, NaverSeller, SimulatorResult } from './types';
import { findInvalidInputs } from './validate';

/**
 * schema.ts의 유니크 인덱스 식 lower(btrim(name))과 **정확히** 같은 규칙이어야 한다.
 * Postgres btrim은 공백 문자(' ')만 제거하므로 JS .trim()(탭·개행까지 제거)을 쓰면 안 된다 —
 * 그러면 "상품\t"과 "상품"을 서비스는 같게, DB 인덱스는 다르게 보아 중복이 새어 들어온다.
 */
export const normalizeProductName = (name: string): string => name.replace(/^ +| +$/g, '').toLowerCase();

type ProductNoResult = SimulatorResult<{ originProductNo: number }>;

const invalid = (invalidInputs: InvalidInput[]): ProductNoResult => ({ ok: false, reason: 'INVALID', invalidInputs });

const duplicate = (): ProductNoResult => ({
  ok: false,
  reason: 'DUPLICATE',
  invalidInputs: [{ name: 'name', type: 'DUPLICATE', message: '이미 등록된 상품명입니다.' }],
});

/** 주소록은 저장소를 봐야 하므로 validate가 아니라 여기서 확인한다. */
const findAddressProblems = async (
  repository: NaverRepository,
  sellerId: string,
  deliveryInfo: NaverDeliveryInfo,
): Promise<InvalidInput[]> => {
  const problems: InvalidInput[] = [];

  const shipping = await repository.findAddress(sellerId, deliveryInfo.shippingAddressId, 'SHIPPING');
  if (!shipping) {
    problems.push({ name: 'deliveryInfo.shippingAddressId', type: 'NOT_FOUND', message: '주소록에 없는 출고지입니다.' });
  }

  const returnAddress = await repository.findAddress(sellerId, deliveryInfo.returnAddressId, 'RETURN');
  if (!returnAddress) {
    problems.push({ name: 'deliveryInfo.returnAddressId', type: 'NOT_FOUND', message: '주소록에 없는 반품지입니다.' });
  }

  return problems;
};

export const registerProduct = async (
  repository: NaverRepository,
  seller: NaverSeller,
  body: unknown,
): Promise<ProductNoResult> => {
  const fieldProblems = findInvalidInputs(body);
  if (fieldProblems.length > 0) return invalid(fieldProblems);

  const request = body as NaverProductRequest;

  const addressProblems = await findAddressProblems(repository, seller.id, request.deliveryInfo);
  if (addressProblems.length > 0) return invalid(addressProblems);

  const existing = await repository.findProductByNormalizedName(seller.id, normalizeProductName(request.name));
  if (existing) return duplicate();

  const productNo = await repository.insertProduct(seller.id, request);
  return { ok: true, data: { originProductNo: productNo } };
};

export const updateProduct = async (
  repository: NaverRepository,
  seller: NaverSeller,
  productNo: number,
  body: unknown,
): Promise<ProductNoResult> => {
  const stored = await repository.findProductByNo(productNo);
  // 남의 상품은 "없음"으로 답한다 — 존재 여부를 다른 판매자에게 알려주지 않는다.
  if (!stored || stored.sellerId !== seller.id) return { ok: false, reason: 'NOT_FOUND', invalidInputs: [] };

  const fieldProblems = findInvalidInputs(body);
  if (fieldProblems.length > 0) return invalid(fieldProblems);

  const request = body as NaverProductRequest;

  const addressProblems = await findAddressProblems(repository, seller.id, request.deliveryInfo);
  if (addressProblems.length > 0) return invalid(addressProblems);

  // 수정은 중복 판정을 하지 않지만, 이름을 자기 다른 상품과 같게 바꾸는 것은 막는다(DB 인덱스도 같은 것을 막는다).
  const sameName = await repository.findProductByNormalizedName(seller.id, normalizeProductName(request.name));
  if (sameName && sameName.productNo !== productNo) return duplicate();

  await repository.updateProduct(productNo, request);
  return { ok: true, data: { originProductNo: productNo } };
};
