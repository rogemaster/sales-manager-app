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

export async function processExcelUpload(
  event: ChangeEvent<HTMLInputElement>,
  fileTemplateInfo: ExcelTemplateInfo[],
): Promise<UploadResult> {
  if (!event.target.files) {
    return {
      success: false,
      message: '파일을 선택해 주세요.',
    };
  }

  const file = event.target.files[0];

  const allowedExts = new Set(['xlsx', 'xls', 'csv']);
  const allowedTypes = new Set([
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ]);

  const ext = file.name.split('.').pop()?.toLowerCase();
  const isValidFile = (ext && allowedExts.has(ext)) || (file.type && allowedTypes.has(file.type));
  if (!isValidFile) {
    return {
      success: false,
      message: '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // 필수값 헤더 추출
    const requiredHeaders = fileTemplateInfo.filter((data) => data.req).map((data) => data.name);

    // validateSheet 함수 호출
    const invalidRows = validateSheet(jsonData as Cell[][], requiredHeaders);
    console.log('검증', invalidRows);

    if (!invalidRows.result) {
      return {
        success: false,
        message: `필수값 누락: ${invalidRows.errorHeaders?.join(', ')}`,
      };
    }

    return {
      success: true,
      message: '업로드가 완료되었습니다.',
      data: jsonData,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: '파일을 선택해주세요.',
    };
  }
}
