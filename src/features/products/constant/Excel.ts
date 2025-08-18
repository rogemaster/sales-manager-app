import { ExcelDownloaderProps, ExcelTemplate, ExcelUploaderProps } from '@/types/ExcelInterface';

export const PRODUCT_BULK_EXCEL_TEMPLATE: ExcelTemplate = {
  templateTitle: '양식 포함 항목:',
  template: [
    {
      name: '상품코드',
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

export const EXCEL_UPLOADER_DESCRIPTION: string = '엑셀 파일을 드래그하거나 클릭하여 업로드하세요';

export const PRODUCT_EXCEL_TEMPLATE_DOWNLOADER: ExcelDownloaderProps = {
  excelHeader: {
    excelType: 'DOWNLOAD',
    headerTitle: '1단계: 양식 다운로드',
    headerDescription: '상품 등록을 위한 엑셀 양식을 다운로드하여 데이터를 입력하세요.',
  },
  isTemplateInfo: true,
  templateInfo: PRODUCT_BULK_EXCEL_TEMPLATE,
};

export const PRODUCT_EXCEL_TEMPLATE_UPLOADER: ExcelUploaderProps = {
  excelHeader: {
    excelType: 'UPLOAD',
    headerTitle: '2단계: 파일 업로드',
    headerDescription: '작성한 엑셀 파일을 업로드하여 상품 데이터를 불러오세요.',
  },
  contentDescription: EXCEL_UPLOADER_DESCRIPTION,
};
