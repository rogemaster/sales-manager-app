import {
  PRODUCT_EXCEL_PREVIEW_HEADER,
  PRODUCT_EXCEL_TABLE_COLUMNS,
  PRODUCT_EXCEL_TEMPLATE_DOWNLOADER,
  PRODUCT_EXCEL_TEMPLATE_UPLOADER,
} from '../../constant/Excel';
import { ExcelDataPreview, ExcelDownloader, ExcelUploader } from '@/components/excel';
import { ProductExcelPreviewRow } from '../../types/ProductTypes';

type Props = {
  uploadedData?: ProductExcelPreviewRow[];
};

export const ProductBulkUploadLayout = ({ uploadedData }: Props) => {
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
        />

        {/* 파일 업로드 - 완 */}
        <ExcelUploader
          excelHeader={PRODUCT_EXCEL_TEMPLATE_UPLOADER.excelHeader}
          contentDescription={PRODUCT_EXCEL_TEMPLATE_UPLOADER.contentDescription}
        />
      </div>

      {/* 업로드된 데이터 미리보기 */}
      {uploadedData && uploadedData.length > 0 && (
        <ExcelDataPreview<ProductExcelPreviewRow>
          excelHeader={PRODUCT_EXCEL_PREVIEW_HEADER}
          tableColumns={PRODUCT_EXCEL_TABLE_COLUMNS}
          uploadedData={uploadedData}
          getRowClassName={(r) => (r.state === 'error' ? 'bg-red-50' : undefined)}
          getRowKey={(r, i) => r.row ?? i}
          getErrorCount={(rows) => rows.filter((r) => r.state === 'valid').length}
          getValidCount={(rows) => rows.filter((r) => r.state === 'error').length}
        />
      )}
    </div>
  );
};
