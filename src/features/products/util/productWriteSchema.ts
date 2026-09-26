import { z } from 'zod';
import { FilterOption } from '@/types/common.type';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import {
  ADULT_PRODUCT_OPTIONS,
  ORIGIN_COUNTRIES,
  TAX_TYPE_OPTIONS,
} from '@/features/products/constant/compliance.constants';
import { CUSTOMER_CODE_MAX_LENGTH } from '@/features/products/util/customerCode';
import { PRODUCT_BULK_MAX_ROWS } from '@/features/products/constant/bulk.constant';
import { MAX_IMAGE_URL_LENGTH } from '@/shared/constant/upload.constant';
import { objectBodySchema } from '@/shared/utils/requestBody';

// integer 컬럼의 범위. 넘으면 Postgres가 던져 배치 전체가 500이 된다.
const MAX_INT = 2147483647;

// 메시지에 싣는 값의 길이. 10만 자 상품명이 그대로 응답에 실리는 것을 막는다.
const MAX_VALUE_IN_MESSAGE = 50;

const INVALID_PRODUCT_MESSAGE = '상품 데이터의 형식이 올바르지 않습니다';

const codes = (options: FilterOption[]) => options.map(({ id }) => id) as [string, ...string[]];

/** 0 이상 정수. 판매가·배송비·총수량·공급가와 옵션 수량이 모두 같은 규칙이다. */
const count = z.number().int().min(0).max(MAX_INT);

const optionCombination = z.object({
  values: z.record(z.string()),
  // 할인 옵션을 표현하므로 음수를 허용한다. 범위만 본다.
  optionPrice: z.number().int().min(-MAX_INT).max(MAX_INT).nullish(),
  quantity: count.nullish(),
  skuCode: z.string().max(100).nullish(),
});

const informationDisclosure = z.object({
  key: z.string(),
  id: z.string(),
  name: z.string(),
  fields: z.record(z.union([z.string(), z.number(), z.null()])),
});

const text = (limit: number) => ({ schema: z.string().max(limit), kind: 'length' as const, limit });
const list = <T extends z.ZodTypeAny>(item: T, limit: number) => ({
  schema: z.array(item).max(limit),
  kind: 'list' as const,
  limit,
});
const code = (options: FilterOption[]) => ({ schema: z.enum(codes(options)), kind: 'code' as const, limit: 0 });
const number = () => ({ schema: count, kind: 'count' as const, limit: 0 });

/**
 * 필드별 규칙. 한글 라벨을 함께 들고 있어 메시지가 코드 이름을 노출하지 않는다.
 * 배열 순서가 곧 검사 순서이고, 첫 위반 하나만 돌려준다.
 */
const FIELDS: {
  key: string;
  label: string;
  required: boolean;
  schema: z.ZodTypeAny;
  kind: 'length' | 'count' | 'code' | 'list' | 'shape';
  limit: number;
}[] = [
  { key: 'name', label: '상품명', required: true, ...text(200) },
  { key: 'categoryId', label: '카테고리', required: true, ...text(100) },
  { key: 'brand', label: '브랜드', required: true, ...text(100) },
  { key: 'manufacturer', label: '제조업체', required: true, ...text(100) },
  { key: 'detailPage', label: '상세설명', required: true, ...text(50000) },
  { key: 'mainImage', label: '메인이미지', required: true, ...text(MAX_IMAGE_URL_LENGTH) },
  { key: 'customerCode', label: '고객상품코드', required: false, ...text(CUSTOMER_CODE_MAX_LENGTH) },
  { key: 'modelName', label: '모델명', required: false, ...text(100) },
  { key: 'modelId', label: '모델번호', required: false, ...text(100) },
  { key: 'originCountryEtc', label: '원산지(기타)', required: false, ...text(100) },

  { key: 'price', label: '판매가', required: true, ...number() },
  { key: 'deliveryPrice', label: '배송비', required: true, ...number() },
  { key: 'totalQuantity', label: '총수량', required: true, ...number() },
  { key: 'netPrice', label: '공급가', required: false, ...number() },

  { key: 'state', label: '판매상태', required: true, ...code(PRODUCT_STATUS) },
  { key: 'deliveryType', label: '배송정책', required: true, ...code(DELIVERY_TYPE_OPTION) },
  { key: 'taxType', label: '부가세유형', required: false, ...code(TAX_TYPE_OPTIONS) },
  { key: 'adultProductType', label: '성인상품여부', required: false, ...code(ADULT_PRODUCT_OPTIONS) },
  { key: 'originCountryCode', label: '원산지', required: false, ...code(ORIGIN_COUNTRIES) },

  { key: 'keyWords', label: '키워드', required: false, ...list(z.string().max(50), 20) },
  { key: 'option', label: '옵션', required: false, ...list(optionCombination, 1000) },
  { key: 'subOption', label: '추가옵션', required: false, ...list(optionCombination, 1000) },

  {
    key: 'informationDisclosure',
    label: '규정정보',
    required: true,
    schema: informationDisclosure,
    kind: 'shape' as const,
    limit: 0,
  },
];

type Field = (typeof FIELDS)[number];

const shorten = (value: unknown): string => {
  const raw = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
  return raw.length > MAX_VALUE_IN_MESSAGE ? `${raw.slice(0, MAX_VALUE_IN_MESSAGE)}...` : raw;
};

/**
 * 받침 유무로 조사를 고른다. '상품명은'과 '브랜드는'을 한 문장 틀로 만들기 위한 것이다.
 * 라벨마다 문장을 따로 쓰면 문구가 갈라지고, 조사를 고정하면 어느 한쪽이 반드시 어색해진다.
 * 한글 음절이 아닌 글자로 끝나면(예: '원산지(기타)') 받침 없음으로 본다.
 */
const hasFinalConsonant = (word: string): boolean => {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
};

const topic = (label: string) => `${label}${hasFinalConsonant(label) ? '은' : '는'}`;
const subject = (label: string) => `${label}${hasFinalConsonant(label) ? '이' : '가'}`;

const violationOf = ({ label, kind, limit }: Field, value: unknown): string => {
  if (kind === 'count') return `${topic(label)} 0 이상의 정수여야 합니다: '${shorten(value)}'`;
  if (kind === 'code') return `${label}에 사용할 수 없는 값입니다: '${shorten(value)}'`;

  // 길이·개수 위반은 값을 싣지 않는다. 상한을 넘긴 값이라 메시지가 그 값으로 뒤덮인다.
  if (kind === 'length' && typeof value === 'string' && value.length > limit) {
    return `${topic(label)} ${limit}자를 넘을 수 없습니다`;
  }
  if (kind === 'list' && Array.isArray(value) && value.length > limit) {
    return `${topic(label)} ${limit}개를 넘을 수 없습니다`;
  }

  return `${label}의 형식이 올바르지 않습니다`;
};

/**
 * 첫 위반 하나를 한글 메시지로 돌려준다. 없으면 null.
 *
 * 컬럼이 text·integer라 DB가 값을 걸러주지 않는다. 화면 폼은 Select와 입력 규칙으로 막지만
 * API로 직접 요청하면 폼을 거치지 않으므로 쓰기 경로마다 여기서 본다.
 *
 * 'partial'은 PATCH용이다 — 보내지 않은 필드는 검사하지 않는다.
 */
export const findProductWriteViolation = (product: unknown, mode: 'full' | 'partial' = 'full'): string | null => {
  if (typeof product !== 'object' || product === null) return INVALID_PRODUCT_MESSAGE;

  const record = product as Record<string, unknown>;

  for (const field of FIELDS) {
    const value = record[field.key];

    // DB의 nullable 컬럼은 그대로 null로 돌아오고, 빈 숫자 입력은 NaN을 거쳐 JSON에서 null이 된다.
    // 선택 필드의 null은 "값 없음"이므로 undefined와 같게 다룬다. 필수 필드의 null은 그대로 걸린다.
    if (value === undefined || (value === null && !field.required)) {
      if (mode === 'partial' || !field.required) continue;
      return `${subject(field.label)} 없습니다`;
    }

    if (!field.schema.safeParse(value).success) return violationOf(field, value);
  }

  return null;
};

/**
 * 저장할 필드만 남긴다. productId·ownerId·createDate·updateDate는 서버가 정하므로 요청에 섞여 와도 버린다.
 * FIELDS가 곧 쓰기 가능한 필드 목록이다 — 여기 없는 필드는 검증도 저장도 되지 않는다.
 */
export const pickProductWriteFields = (input: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(FIELDS.filter(({ key }) => key in input).map(({ key }) => [key, input[key]]));

// 요청 본문의 겉모양만 본다. 필드 규칙은 한글 라벨 메시지를 만드는 findProductWriteViolation이 맡는다.
const productObject = objectBodySchema(INVALID_PRODUCT_MESSAGE);

/** POST /api/products/create, PATCH /api/products/[productId] 요청 본문. */
export const productWriteBodySchema = productObject;

/** POST /api/products/bulk 요청 본문. 엑셀 업로드가 앞에서 건수를 막지만 그 검사는 브라우저에서만 돈다. */
export const productBulkRequestSchema = z.object(
  {
    products: z
      .array(productObject, { required_error: INVALID_PRODUCT_MESSAGE, invalid_type_error: INVALID_PRODUCT_MESSAGE })
      .max(PRODUCT_BULK_MAX_ROWS, `한 번에 최대 ${PRODUCT_BULK_MAX_ROWS}건까지 등록할 수 있습니다.`),
  },
  { invalid_type_error: INVALID_PRODUCT_MESSAGE },
);
