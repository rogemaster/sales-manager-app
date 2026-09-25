import { ExcelDownloaderProps, ExcelUploaderProps, ExcelHeaderProps, ExcelTableColumnsType } from '@/types/excel.type';
import { PRODUCT_BULK_EXCEL_TEMPLATE, PRODUCT_EXCEL_COL } from './bulkTemplate.constant';
import {
  formatExcelOptionSummary,
  resolveExcelTotalQuantity,
  toExcelOptionPairs,
} from '@/features/products/util/excelOptions';
import { PRODUCT_BULK_MAX_ROWS } from './bulk.constant';
import { getSheetRow } from '@/components/excel/utils/sheetRows';
import { ExcelRowWithErrors } from '@/types/excel.type';

/** 미리보기 셀 값. 행 객체에는 오류 배열(error)도 같은 모양으로 섞여 있어 배열은 걸러낸다. */
const cellOf = (row: ExcelRowWithErrors, column: string) => {
  const value = row[column];
  return Array.isArray(value) ? undefined : value;
};

// 엑셀 양식 다운로드
export const PRODUCT_EXCEL_TEMPLATE_DOWNLOADER: ExcelDownloaderProps = {
  excelHeader: {
    excelType: 'DOWNLOAD',
    headerTitle: '1단계: 양식 다운로드',
    headerDescription: '상품 등록을 위한 엑셀 양식을 다운로드하여 데이터를 입력하세요.',
  },
  isTemplateInfo: true,
  templateInfo: PRODUCT_BULK_EXCEL_TEMPLATE,
};

// 엑셀 업로드
export const PRODUCT_EXCEL_TEMPLATE_UPLOADER: ExcelUploaderProps = {
  excelHeader: {
    excelType: 'UPLOAD',
    headerTitle: '2단계: 파일 업로드',
    headerDescription: '작성한 엑셀 파일을 업로드하여 상품 데이터를 불러오세요.',
  },
  contentDescription: '엑셀 파일을 드래그하거나 클릭하여 업로드하세요',
  fileTemplateInfo: PRODUCT_BULK_EXCEL_TEMPLATE.template,
  maxRows: PRODUCT_BULK_MAX_ROWS,
};

// 엑셀 데이터 미리보기
export const PRODUCT_EXCEL_PREVIEW_HEADER: ExcelHeaderProps = {
  headerTitle: '3단계: 데이터 확인 및 저장',
  headerDescription: '업로드된 데이터를 확인하고 오류를 수정한 후 저장하세요.',
};

// 엑셀 미리보기 테이블 헤더
export const PRODUCT_EXCEL_TABLE_COLUMNS: ExcelTableColumnsType[] = [
  {
    key: 'row',
    headerTitle: '행',
    // 엑셀 시트의 행 번호. 사용자가 파일에서 그 행을 바로 찾을 수 있게 index가 아니라 시트 행을 보여준다.
    accessor: (r) => getSheetRow(r),
  },
  {
    key: 'state',
    headerTitle: '상태',
    accessor: (r) => (Array.isArray(r.error) && r.error.length > 0 ? '오류' : '정상'),
  },
  {
    key: 'customerCode',
    headerTitle: PRODUCT_EXCEL_COL.customerCode,
    accessor: (r) => cellOf(r, PRODUCT_EXCEL_COL.customerCode),
    cellClassName: 'font-mono text-sm',
  },
  {
    key: 'name',
    headerTitle: PRODUCT_EXCEL_COL.name,
    accessor: (r) => cellOf(r, PRODUCT_EXCEL_COL.name),
  },
  {
    key: 'category',
    headerTitle: PRODUCT_EXCEL_COL.category,
    accessor: (r) => cellOf(r, PRODUCT_EXCEL_COL.category),
  },
  {
    key: 'price',
    headerTitle: PRODUCT_EXCEL_COL.price,
    accessor: (r) => cellOf(r, PRODUCT_EXCEL_COL.price),
  },
  {
    key: 'options',
    headerTitle: '옵션',
    accessor: (r) => {
      const { pairs, subPairs } = toExcelOptionPairs(r);
      return formatExcelOptionSummary(pairs, subPairs);
    },
  },
  {
    key: 'totalQuantity',
    headerTitle: PRODUCT_EXCEL_COL.totalQuantity,
    accessor: (r) => resolveExcelTotalQuantity(r),
  },
  {
    key: 'error',
    headerTitle: '오류 내용',
    accessor: (r) =>
      Array.isArray(r.error) &&
      r.error.map((e, i) => (
        <div className="text-sm text-red-600" key={i}>
          • {e.message}
        </div>
      )),
  },
];
