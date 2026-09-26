import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { FilterOption } from '@/types/common.type';
import { Product } from '@/features/products/types/product.types';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';
import { CATEGORIES } from '@/shared/constant/category.constant';
import { PRODUCT_EXCEL_COL } from '@/features/products/constant/bulkTemplate.constant';
import {
  buildCombinationsFromExcel,
  resolveTotalQuantity,
  toExcelOptionPairs,
  toText,
} from '@/features/products/util/excelOptions';

/**
 * 시트의 한글 표시명을 도메인 코드로 바꾼다. 목록에 없으면 undefined를 돌려주고 호출부가 기본값으로 떨어진다.
 * 값을 그대로 통과시키면 코드값이 아닌 문자열이 DB까지 내려가고, 표시 단계(ProductStatusBadge 등)에서야
 * 터진다 — 업로드 검증(양식의 allowed)이 앞에서 막지만 그 검증에만 기대지 않는다.
 */
const toCode = (options: FilterOption[], value: unknown): string | undefined =>
  options.find((option) => option.name === toText(value))?.id;

export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Product, 'ownerId'>[] => {
  return rows.map((r) => {
    // 총수량은 req: true라 검증에서 빈 값이 걸리지만, 전략이 그 전제에 기대지 않게 가드를 둔다
    const quantity = Number(r[PRODUCT_EXCEL_COL.totalQuantity]) || 0;

    // 1행 = 1상품이라 조합별 수량·SKU를 개별 지정할 수 없다. 총수량과 접두사로 일괄 채운다
    const { pairs, subPairs } = toExcelOptionPairs(r);
    const option = buildCombinationsFromExcel(pairs, quantity, toText(r[PRODUCT_EXCEL_COL.skuPrefix]));
    const subOption = buildCombinationsFromExcel(subPairs, quantity, toText(r[PRODUCT_EXCEL_COL.subSkuPrefix]));

    return {
      // 이 값은 서버에서 버려진다 — /api/products/bulk가 교차 테넌트 PK 충돌을 막으려고 항상 재채번한다.
      productId: generatorProductCode(),
      customerCode: (r[PRODUCT_EXCEL_COL.customerCode] as string) || undefined,
      name: r[PRODUCT_EXCEL_COL.name] as string,
      categoryId: toCode(CATEGORIES, r[PRODUCT_EXCEL_COL.category]) || '',
      brand: (r[PRODUCT_EXCEL_COL.brand] as string) || '',
      manufacturer: (r[PRODUCT_EXCEL_COL.manufacturer] as string) || '',
      // 시트에서 숫자로 파싱될 수 있어 String()으로 좁힌다 (as string은 컴파일 타임 캐스팅이라 런타임 값이 number인 채로 남는다)
      modelName: r[PRODUCT_EXCEL_COL.modelName] ? String(r[PRODUCT_EXCEL_COL.modelName]) : undefined,
      modelId: r[PRODUCT_EXCEL_COL.modelId] ? String(r[PRODUCT_EXCEL_COL.modelId]) : undefined,
      netPrice: r[PRODUCT_EXCEL_COL.netPrice] ? Number(r[PRODUCT_EXCEL_COL.netPrice]) : undefined,
      price: Number(r[PRODUCT_EXCEL_COL.price]),
      state: (toCode(PRODUCT_STATUS, r[PRODUCT_EXCEL_COL.state]) as Product['state']) || 'WAIT_SALE',
      deliveryType: toCode(DELIVERY_TYPE_OPTION, r[PRODUCT_EXCEL_COL.deliveryType]) || '',
      deliveryPrice: Number(r[PRODUCT_EXCEL_COL.deliveryPrice]),
      mainImage: (r[PRODUCT_EXCEL_COL.mainImage] as string) || '',
      detailPage: (r[PRODUCT_EXCEL_COL.detailPage] as string) || '',
      option,
      subOption,
      totalQuantity: resolveTotalQuantity(option, quantity),
      keyWords: r[PRODUCT_EXCEL_COL.keyWord]
        ? (r[PRODUCT_EXCEL_COL.keyWord] as string).split(',').map((k) => k.trim())
        : undefined,
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      createDate: new Date(),
      updateDate: new Date(),
    };
  });
};
