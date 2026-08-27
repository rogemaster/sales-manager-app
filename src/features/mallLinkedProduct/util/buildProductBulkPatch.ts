import { Product } from '@/features/products/types/product.types';
import {
  PRODUCT_BULK_EDIT_GROUPS,
  ProductBulkEditChecked,
  ProductBulkEditGroupKey,
} from '../constant/productBulkEdit.constants';

const checkedGroups = (checked: ProductBulkEditChecked): ProductBulkEditGroupKey[] =>
  (Object.keys(PRODUCT_BULK_EDIT_GROUPS) as ProductBulkEditGroupKey[]).filter((group) => checked[group] === true);

/**
 * 체크된 그룹이 커버하는 키만 골라 서버로 보낼 patch를 만든다.
 *
 * 미체크 키는 값을 undefined로 담지 않고 키 자체를 넣지 않는다 —
 * 서버가 `{ ...기존, ...patch }`로 얕은 병합하므로, undefined가 담기면 기존 값이 지워진다.
 *
 * 체크했는데 값이 undefined인 키(선택 안 한 Select, 빈 숫자 입력 등)도 여기서 빼고
 * collectClearKeys가 따로 모은다 — JSON.stringify가 undefined 값을 가진 키를 통째로 지워버려
 * patch에 담아봤자 서버까지 가지 못하기 때문이다.
 */
export const buildProductBulkPatch = (values: Partial<Product>, checked: ProductBulkEditChecked): Partial<Product> => {
  const patch: Partial<Product> = {};

  checkedGroups(checked).forEach((group) => {
    PRODUCT_BULK_EDIT_GROUPS[group].forEach((key) => {
      if (values[key] === undefined) return;
      // 타입 파라미터별 대입을 TS가 좁히지 못해 단언이 필요하다. 키·값 모두 같은 Product에서 왔다.
      (patch as Record<string, unknown>)[key] = values[key];
    });
  });

  return patch;
};

/**
 * 체크했는데 값이 undefined인 키 목록 — 서버가 스냅샷에서 이 키들을 지운다.
 *
 * 빈 문자열은 여기 들어오지 않는다. ''는 "값이 없다"가 아니라 실제로 저장되는 값이라
 * patch가 그대로 나른다.
 */
export const collectClearKeys = (values: Partial<Product>, checked: ProductBulkEditChecked): (keyof Product)[] =>
  checkedGroups(checked).flatMap((group) => PRODUCT_BULK_EDIT_GROUPS[group].filter((key) => values[key] === undefined));

/**
 * 체크된 그룹이 커버하는 Product 키 목록. RHF trigger()에 넘겨 검증 범위를 좁히는 데 쓴다.
 *
 * handleSubmit을 쓰지 않는 이유가 여기 있다 — 재사용하는 정보고시 섹션에 required 규칙이 있어,
 * 전체 검증을 돌리면 체크하지 않은 정보고시 때문에 제출이 막힌다.
 */
export const collectCheckedFieldNames = (checked: ProductBulkEditChecked): (keyof Product)[] =>
  checkedGroups(checked).flatMap((group) => [...PRODUCT_BULK_EDIT_GROUPS[group]]);
