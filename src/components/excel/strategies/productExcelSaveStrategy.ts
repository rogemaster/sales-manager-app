import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { Product } from '@/features/products/types/product.types';
import {
  buildCombinationsFromExcel,
  resolveTotalQuantity,
  toExcelOptionPairs,
  toText,
} from '@/features/products/util/excelOptions';

export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Product, 'ownerId'>[] => {
  return rows.map((r) => {
    // 총수량은 req: true라 검증에서 빈 값이 걸리지만, 전략이 그 전제에 기대지 않게 가드를 둔다
    const quantity = Number(r['총수량']) || 0;

    // 1행 = 1상품이라 조합별 수량·SKU를 개별 지정할 수 없다. 총수량과 접두사로 일괄 채운다
    const { pairs, subPairs } = toExcelOptionPairs(r);
    const option = buildCombinationsFromExcel(pairs, quantity, toText(r['SKU']));
    const subOption = buildCombinationsFromExcel(subPairs, quantity, toText(r['추가SKU']));

    return {
      productId: generatorProductCode(),
      customerCode: (r['고객상품코드'] as string) || undefined,
      name: r['상품명'] as string,
      categoryId: (r['카테고리'] as string) || '',
      brand: (r['브랜드'] as string) || '',
      manufacturer: (r['제조업체'] as string) || '',
      // 시트에서 숫자로 파싱될 수 있어 String()으로 좁힌다 (as string은 컴파일 타임 캐스팅이라 런타임 값이 number인 채로 남는다)
      modelName: r['모델명'] ? String(r['모델명']) : undefined,
      modelId: r['모델번호'] ? String(r['모델번호']) : undefined,
      netPrice: r['공급가'] ? Number(r['공급가']) : undefined,
      price: Number(r['판매가']),
      state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
      deliveryType: (r['배송정책'] as string) || '',
      deliveryPrice: Number(r['배송비']),
      mainImage: (r['메인이미지'] as string) || '',
      detailPage: (r['상세설명'] as string) || '',
      option,
      subOption,
      totalQuantity: resolveTotalQuantity(option, quantity),
      keyWords: r['키워드'] ? (r['키워드'] as string).split(',').map((k) => k.trim()) : undefined,
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      createDate: new Date(),
      updateDate: new Date(),
    };
  });
};
