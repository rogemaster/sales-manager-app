import {
  ExcelDownloaderProps,
  ExcelTemplate,
  ExcelUploaderProps,
  ExcelHeaderProps,
  ExcelTableColumnsType,
} from '@/types/ExcelInterface';
import { ProductExcelPreviewRow } from '../types/ProductTypes';

// 엑셀 양식 템플릿
export const PRODUCT_BULK_EXCEL_TEMPLATE: ExcelTemplate = {
  templateTitle: '양식 포함 항목:',
  template: [
    {
      name: '고객상품코드',
      req: false,
    },
    {
      name: '상품명',
      req: true,
    },
    {
      name: '키워드',
      req: false,
    },
    {
      name: '카테고리',
      req: false,
    },
    {
      name: '공급가',
      req: false,
    },
    {
      name: '판매가',
      req: true,
    },
    {
      name: '판매상태',
      req: true,
    },
    {
      name: '배송정책',
      req: true,
    },
    {
      name: '배송비',
      req: true,
    },
    {
      name: '메인이미지',
      req: true,
    },
    {
      name: '옵션',
      req: false,
    },
    {
      name: '상세설명',
      req: true,
    },
  ],
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
};

// 엑셀 데이터 미리보기
export const PRODUCT_EXCEL_PREVIEW_HEADER: ExcelHeaderProps = {
  headerTitle: '3단계: 데이터 확인 및 저장',
  headerDescription: '업로드된 데이터를 확인하고 오류를 수정한 후 저장하세요.',
};

// 엑셀 미리보기 테이블 헤더
export const PRODUCT_EXCEL_TABLE_COLUMNS: ExcelTableColumnsType<ProductExcelPreviewRow>[] = [
  {
    key: 'row',
    headerTitle: '행',
    accessor: (r) => r.row,
  },
  {
    key: 'state',
    headerTitle: '상태',
    accessor: (r) => (r.state === 'valid' ? '정상' : '오류'),
  },
  {
    key: 'customerCode',
    headerTitle: '고객상품코드',
    accessor: (r) => r.customerCode ?? '-',
    cellClassName: 'font-mono text-sm',
  },
  {
    key: 'name',
    headerTitle: '상품명',
    accessor: (r) => r.name ?? '-',
  },
  {
    key: 'category',
    headerTitle: '카테고리',
    accessor: (r) => r.category ?? '-',
  },
  {
    key: 'price',
    headerTitle: '가격',
    accessor: (r) => r.price ?? '-',
  },
  {
    key: 'totalQuantity',
    headerTitle: '수량',
    accessor: (r) => r.totalQuantity ?? '-',
  },
  {
    key: 'error',
    headerTitle: '오류 내용',
    accessor: (r) =>
      r.error.length > 0 && (
        <div className="text-sm text-red-600">
          {r.error!.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      ),
  },
];
