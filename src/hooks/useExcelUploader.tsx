import { Cell, validateSheet } from '@/lib/excel/validate';
import { ExcelTemplateInfo } from '@/types/ExcelInterface';
import { ChangeEvent } from 'react';
import XLSX from 'xlsx';

export const useExcelUploader = (event: ChangeEvent<HTMLInputElement>, fileDataInfo: ExcelTemplateInfo[]) => {
  if (event.target.files) {
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!(result instanceof ArrayBuffer)) {
        return;
      }
      const data = new Uint8Array(result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // 필수값 헤더 추출
      const requiredHeaders = fileDataInfo.filter((data) => data.req).map((data) => data.name);

      // validateSheet 함수 호출
      const invalidRows = validateSheet(jsonData as Cell[][], requiredHeaders);

      if (!invalidRows.result) {
        // TOBE: 공통 alert 컴포넌트 개발 후 처리
        return;
      }

      // 검증 완료 TOBE: 공통 alert 컴포넌트 개발 후 처리
    };

    return reader.readAsArrayBuffer(file);
  }
};
