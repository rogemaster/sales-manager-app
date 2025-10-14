'use client';

import { ExcelProvider } from '@/components/providers/ExcelProvider';
import { ProductBulkUploadLayout } from '@/features/products/ui/bulk/ProductBulkUploadLayout';

export default function ProductBulkUpload() {
  return (
    <ExcelProvider>
      <ProductBulkUploadLayout />
    </ExcelProvider>
  );
}
