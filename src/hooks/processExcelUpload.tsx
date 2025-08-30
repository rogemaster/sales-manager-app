'use client';

import { Cell, validateSheet } from '@/lib/excel/validate';
import { ExcelTemplateInfo } from '@/types/ExcelInterface';
import { ChangeEvent } from 'react';
import * as XLSX from 'xlsx';

export type UploadResult = {
  success: boolean;
  message: string;
  data?: unknown;
};

export const processExcelUpload = (
  event: ChangeEvent<HTMLInputElement>,
  fileTemplateInfo: ExcelTemplateInfo[],
): Promise<UploadResult> => {
  return new Promise((resolve) => {
    if (event.target.files) {
      const file = event.target.files[0];

      // 파일 형식 검증
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ];

      if (!allowedTypes.includes(file.type)) {
        resolve({
          success: false,
          message: '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          resolve({
            success: false,
            message: '파일 읽기에 실패했습니다.',
          });
          return;
        }

        const data = new Uint8Array(result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 필수값 헤더 추출
        const requiredHeaders = fileTemplateInfo.filter((data) => data.req).map((data) => data.name);

        // validateSheet 함수 호출
        const invalidRows = validateSheet(jsonData as Cell[][], requiredHeaders);
        console.log('검증', invalidRows);

        if (!invalidRows.result) {
          resolve({
            success: false,
            message: '필수값이 누락되었습니다.',
          });
          return;
        }

        resolve({
          success: true,
          message: '업로드가 완료되었습니다.',
          data: jsonData,
        });
      };

      reader.readAsArrayBuffer(file);
    } else {
      resolve({
        success: false,
        message: '파일을 선택해주세요.',
      });
    }
  });
};
