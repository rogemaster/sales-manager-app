import { generatorProductCode } from '@/utils/codeGenerator';
import { ExcelRowWithErrors } from '@/types/excel.type';
import { Product } from '@/features/products/types/product.types';

export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Omit<Product, 'ownerId'>[] => {
  return rows.map((r) => ({
    productId: generatorProductCode(),
    customerCode: (r['고객상품코드'] as string) || undefined,
    name: r['상품명'] as string,
    categoryId: (r['카테고리'] as string) || '',
    brand: (r['브랜드'] as string) || '',
    manufacturer: (r['제조업체'] as string) || '',
    // 모델명·모델번호는 시트에서 숫자로 파싱될 수 있어 String으로 고정한다(앞자리 0·자릿수 손실 방지)
    modelName: r['모델명'] ? String(r['모델명']) : undefined,
    modelId: r['모델번호'] ? String(r['모델번호']) : undefined,
    netPrice: r['공급가'] ? Number(r['공급가']) : undefined,
    price: Number(r['판매가']),
    state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
    deliveryType: (r['배송정책'] as string) || '',
    deliveryPrice: Number(r['배송비']),
    mainImage: (r['메인이미지'] as string) || '',
    detailPage: (r['상세설명'] as string) || '',
    totalQuantity: Number(r['총수량']),
    keyWords: r['키워드'] ? (r['키워드'] as string).split(',').map((k) => k.trim()) : undefined,
    informationDisclosure: { key: '', id: '', name: '', fields: {} },
    createDate: new Date(),
    updateDate: new Date(),
  }));
};
