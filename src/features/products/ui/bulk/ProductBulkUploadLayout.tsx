import { useEffect } from 'react';
import { useResetExcelData } from '@/store/excelDataStore';
import { ProductExcelPreviewRow } from '../../types/ProductTypes';
import {
  PRODUCT_EXCEL_PREVIEW_HEADER,
  PRODUCT_EXCEL_TABLE_COLUMNS,
  PRODUCT_EXCEL_TEMPLATE_DOWNLOADER,
  PRODUCT_EXCEL_TEMPLATE_UPLOADER,
  PRODUCT_BULK_EXCEL_TEMPLATE,
} from '../../constant/Excel';
import { ExcelDataPreview, ExcelDownloader, ExcelUploader } from '@/components/excel';

export const ProductBulkUploadLayout = () => {
  const resetExcelData = useResetExcelData();

  // 페이지 언마운트될 때 초기화
  useEffect(() => {
    return () => {
      resetExcelData();
    };
  }, []);

  // 템플릿에서 헤더 이름만 추출
  const templateHeaders = PRODUCT_BULK_EXCEL_TEMPLATE.template.map((item) => item.name);

  return (
    <div className="max-w-[90%] mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">상품 대량등록</h1>
        <p className="text-muted-foreground">엑셀 파일을 이용하여 여러 상품을 한번에 등록하세요.</p>
      </div>

      {/* 업로드 섹션 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 양식 다운로드 - 완 */}
        <ExcelDownloader
          excelHeader={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.excelHeader}
          isTemplateInfo={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.isTemplateInfo}
          templateInfo={PRODUCT_EXCEL_TEMPLATE_DOWNLOADER.templateInfo}
          templateHeaders={templateHeaders}
          templateName="상품등록"
        />

        {/* 파일 업로드 - 완 */}
        <ExcelUploader
          excelHeader={PRODUCT_EXCEL_TEMPLATE_UPLOADER.excelHeader}
          contentDescription={PRODUCT_EXCEL_TEMPLATE_UPLOADER.contentDescription}
          fileTemplateInfo={PRODUCT_BULK_EXCEL_TEMPLATE.template}
        />
      </div>

      {/* 업로드된 데이터 미리보기 */}
      <ExcelDataPreview<ProductExcelPreviewRow>
        excelHeader={PRODUCT_EXCEL_PREVIEW_HEADER}
        tableColumns={PRODUCT_EXCEL_TABLE_COLUMNS}
        getRowClassName={(r) => (r.state === 'error' ? 'bg-red-50' : undefined)}
        getRowKey={(r, i) => r.row ?? i}
        getErrorCount={(rows) => rows.filter((r) => r.state === 'error').length}
        getValidCount={(rows) => rows.filter((r) => r.state === 'valid').length}
      />
    </div>
  );
};
