import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { toProductImageUrl } from '@/features/products/util/productImage';
import { ORIGIN_ETC } from '@/features/products/constant/compliance.constants';

/**
 * 네이버 상품 등록·수정 요청 본문. 시뮬레이터 타입(src/simulators/naver/types.ts)을 import하지 않고
 * 어댑터가 자기 것으로 정의한다 — 실제 외부몰은 우리에게 TS 타입을 주지 않는다(import-ban-as-network-boundary).
 */
export interface NaverProductPayload {
  name: string;
  statusType: string;
  leafCategoryId: string;
  detailContent: string;
  images: { representativeImage: { url: string } };
  salePrice: number;
  stockQuantity: number;
  deliveryInfo: {
    deliveryFeeType: string;
    baseFee: number;
    deliveryCompany: string;
    shippingAddressId: string;
    returnAddressId: string;
  };
  brandName: string;
  manufacturerName: string;
  productInfoProvidedNotice: Record<string, unknown>;
  sellerManagementCode?: string;
  modelName?: string;
  modelId?: string;
  taxType?: string;
  originAreaCode?: string;
  minorPurchasable?: boolean;
  sellerTags?: string[];
  optionCombinations?: { values: Record<string, string>; quantity: number; skuCode: string; optionPrice: number }[];
}

const STATUS_TYPE: Record<string, string> = {
  ON_SALE: 'SALE',
  WAIT_SALE: 'WAIT',
  SOLD_OUT: 'OUTOFSTOCK',
  SALE_DIS: 'SUSPENSION',
};

// NOT_FREE만 표기가 다르다. deliveryType이 string이라 타입 체커가 못 잡으므로 테스트가 이 표를 잠근다.
const DELIVERY_FEE_TYPE: Record<string, string> = {
  FREE: 'FREE',
  NOT_FREE: 'PAID',
  CHARGE_RECEIVED: 'CHARGE_RECEIVED',
  CONDITIONAL_FREE: 'CONDITIONAL_FREE',
};

/** null·undefined이 아니면 값을, 아니면 undefined를 준다. 빈 문자열은 보내서 외부몰이 판정하게 둔다. */
const optional = <T>(value: T | null | undefined): T | undefined =>
  value === null || value === undefined ? undefined : value;

const toOriginAreaCode = (product: Product): string | undefined =>
  product.originCountryCode === ORIGIN_ETC ? optional(product.originCountryEtc) : optional(product.originCountryCode);

const toMinorPurchasable = (product: Product): boolean | undefined => {
  if (product.adultProductType === 'ADULT') return false;
  if (product.adultProductType === 'GENERAL') return true;
  return undefined;
};

/**
 * 우리 스냅샷을 네이버 요청으로 바꾼다.
 *
 * 값을 맞추거나 채워 넣지 않는다. 상품명 길이·빈 필수값·모르는 코드값은 그대로 보내 외부몰이 거절하게 둔다 —
 * 검증 책임은 외부몰에 있고(domain-design.md), 여기서 조용히 고치면 시뮬레이터를 만든 이유가 사라진다.
 * 모르는 코드값을 표에서 못 찾으면 원래 값을 보내는 것도 같은 이유다.
 */
export const toNaverProductRequest = (product: Product, setting: ShoppingSetting): NaverProductPayload => {
  const options = [...(product.option ?? []), ...(product.subOption ?? [])];

  const payload: NaverProductPayload = {
    name: product.name,
    statusType: STATUS_TYPE[product.state] ?? product.state,
    leafCategoryId: product.categoryId ?? '',
    detailContent: product.detailPage ?? '',
    // mainImage는 R2 key다. 시뮬레이터는 비어 있지 않은 문자열인지만 보므로 key를 그대로 보내도 통과한다.
    images: { representativeImage: { url: toProductImageUrl(product.mainImage) } },
    salePrice: product.price,
    stockQuantity: product.totalQuantity,
    deliveryInfo: {
      deliveryFeeType: DELIVERY_FEE_TYPE[product.deliveryType] ?? product.deliveryType,
      baseFee: product.deliveryPrice,
      deliveryCompany: setting.deliveryCompany ?? '',
      shippingAddressId: setting.shippingAddress?.code ?? '',
      returnAddressId: setting.returnAddress?.code ?? '',
    },
    brandName: product.brand ?? '',
    manufacturerName: product.manufacturer ?? '',
    productInfoProvidedNotice: product.informationDisclosure as unknown as Record<string, unknown>,
    sellerManagementCode: optional(product.customerCode),
    modelName: optional(product.modelName),
    modelId: optional(product.modelId),
    taxType: optional(product.taxType),
    originAreaCode: toOriginAreaCode(product),
    minorPurchasable: toMinorPurchasable(product),
    sellerTags: product.keyWords?.length ? product.keyWords : undefined,
    optionCombinations: options.length > 0 ? options : undefined,
  };

  // undefined 값의 키를 지운다. JSON.stringify도 지우지만, 테스트와 로그에서 "보내지 않음"이 드러나게 한다.
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as NaverProductPayload;
};
