import { isKnownDeliveryCompany } from './deliveryCompanies';
import type { InvalidInput, InvalidInputType } from './types';

// 네이버에서 빌린 수치다. 우리 쓰기 스키마(상품명 200자, 가격 2147483647)와 일부러 다르다 —
// 규칙이 같으면 전송이 항상 성공해 "검증 책임은 외부몰에 있다"가 집행되지 않는다.
export const NAME_MAX_LENGTH = 100;
export const SALE_PRICE_MAX = 999_999_990;
export const STOCK_QUANTITY_MAX = 99_999_999;

const STATUS_TYPES = ['WAIT', 'SALE', 'OUTOFSTOCK', 'SUSPENSION'];
const DELIVERY_FEE_TYPES = ['FREE', 'CONDITIONAL_FREE', 'PAID', 'CHARGE_RECEIVED'];
const TAX_TYPES = ['TAXABLE', 'TAX_FREE', 'ZERO_RATED'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// 선택 필드의 "값 없음"은 undefined로도 null로도 온다. DB의 nullable 컬럼이 JSON에서 null이 되기 때문이다.
const isAbsent = (value: unknown): boolean => value === undefined || value === null;

const checkRequiredRecord = (value: unknown, name: string, errors: InvalidInput[]): boolean => {
  if (value === undefined || value === null) {
    errors.push({ name, type: 'REQUIRED', message: '필수 값입니다.' });
    return false;
  }
  if (!isRecord(value)) {
    errors.push({ name, type: 'TYPE', message: '객체여야 합니다.' });
    return false;
  }
  return true;
};

const fail = (name: string, type: InvalidInputType, message: string): InvalidInput => ({ name, type, message });

const checkRequiredString = (value: unknown, name: string, errors: InvalidInput[], maxLength?: number): void => {
  if (value === undefined || value === null) {
    errors.push(fail(name, 'REQUIRED', '필수 값입니다.'));
    return;
  }
  if (typeof value !== 'string') {
    errors.push(fail(name, 'TYPE', '문자열이어야 합니다.'));
    return;
  }
  if (value.trim().length === 0) {
    errors.push(fail(name, 'REQUIRED', '필수 값입니다.'));
    return;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    errors.push(fail(name, 'LENGTH', `${maxLength}자 이하여야 합니다.`));
  }
};

const checkRequiredInteger = (value: unknown, name: string, max: number, errors: InvalidInput[]): void => {
  if (value === undefined || value === null) {
    errors.push(fail(name, 'REQUIRED', '필수 값입니다.'));
    return;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push(fail(name, 'TYPE', '정수여야 합니다.'));
    return;
  }
  if (value < 0 || value > max) {
    errors.push(fail(name, 'RANGE', `0 이상 ${max} 이하여야 합니다.`));
  }
};

const checkEnum = (value: unknown, name: string, allowed: string[], errors: InvalidInput[]): void => {
  if (value === undefined || value === null) {
    errors.push(fail(name, 'REQUIRED', '필수 값입니다.'));
    return;
  }
  if (typeof value !== 'string') {
    errors.push(fail(name, 'TYPE', '문자열이어야 합니다.'));
    return;
  }
  if (!allowed.includes(value)) {
    errors.push(fail(name, 'ENUM', `허용되지 않은 값입니다. (${allowed.join(', ')})`));
  }
};

const checkImages = (value: unknown, errors: InvalidInput[]): void => {
  if (!checkRequiredRecord(value, 'images', errors)) return;
  const representative = (value as Record<string, unknown>).representativeImage;
  if (!checkRequiredRecord(representative, 'images.representativeImage', errors)) return;
  checkRequiredString((representative as Record<string, unknown>).url, 'images.representativeImage.url', errors);
};

const checkDeliveryInfo = (value: unknown, errors: InvalidInput[]): void => {
  if (!checkRequiredRecord(value, 'deliveryInfo', errors)) return;
  const record = value as Record<string, unknown>;
  checkEnum(record.deliveryFeeType, 'deliveryInfo.deliveryFeeType', DELIVERY_FEE_TYPES, errors);
  checkRequiredInteger(record.baseFee, 'deliveryInfo.baseFee', SALE_PRICE_MAX, errors);
  checkRequiredString(record.deliveryCompany, 'deliveryInfo.deliveryCompany', errors);
  if (typeof record.deliveryCompany === 'string' && record.deliveryCompany.trim().length > 0 && !isKnownDeliveryCompany(record.deliveryCompany)) {
    errors.push(fail('deliveryInfo.deliveryCompany', 'ENUM', '등록되지 않은 택배사입니다.'));
  }
  // 주소록 ID의 실재 확인은 저장소가 필요하므로 productService가 맡는다. 여기서는 값의 모양만 본다.
  checkRequiredString(record.shippingAddressId, 'deliveryInfo.shippingAddressId', errors);
  checkRequiredString(record.returnAddressId, 'deliveryInfo.returnAddressId', errors);
};

const checkOptional = (body: Record<string, unknown>, errors: InvalidInput[]): void => {
  const optionalStrings = ['sellerManagementCode', 'modelName', 'modelId', 'originAreaCode'];
  optionalStrings.forEach((name) => {
    const value = body[name];
    if (!isAbsent(value) && typeof value !== 'string') errors.push(fail(name, 'TYPE', '문자열이어야 합니다.'));
  });

  if (!isAbsent(body.taxType)) checkEnum(body.taxType, 'taxType', TAX_TYPES, errors);
  if (!isAbsent(body.minorPurchasable) && typeof body.minorPurchasable !== 'boolean') {
    errors.push(fail('minorPurchasable', 'TYPE', 'true 또는 false여야 합니다.'));
  }
  if (!isAbsent(body.sellerTags) && !Array.isArray(body.sellerTags)) {
    errors.push(fail('sellerTags', 'TYPE', '배열이어야 합니다.'));
  }
  if (!isAbsent(body.optionCombinations) && !Array.isArray(body.optionCombinations)) {
    errors.push(fail('optionCombinations', 'TYPE', '배열이어야 합니다.'));
  }
};

/** 첫 위반에서 멈추지 않고 전부 모은다 — 실패 응답의 invalidInputs가 그만큼 쓸모 있어진다. */
export const findInvalidInputs = (body: unknown): InvalidInput[] => {
  if (!isRecord(body)) return [fail('', 'TYPE', '요청 본문이 객체가 아닙니다.')];

  const errors: InvalidInput[] = [];

  checkRequiredString(body.name, 'name', errors, NAME_MAX_LENGTH);
  checkEnum(body.statusType, 'statusType', STATUS_TYPES, errors);
  checkRequiredString(body.leafCategoryId, 'leafCategoryId', errors);
  checkRequiredString(body.detailContent, 'detailContent', errors);
  checkRequiredString(body.brandName, 'brandName', errors);
  checkRequiredString(body.manufacturerName, 'manufacturerName', errors);
  checkRequiredInteger(body.salePrice, 'salePrice', SALE_PRICE_MAX, errors);
  checkRequiredInteger(body.stockQuantity, 'stockQuantity', STOCK_QUANTITY_MAX, errors);
  checkImages(body.images, errors);
  checkDeliveryInfo(body.deliveryInfo, errors);
  checkRequiredRecord(body.productInfoProvidedNotice, 'productInfoProvidedNotice', errors);
  checkOptional(body, errors);

  return errors;
};
