'use client';

import * as XLSX from 'xlsx';
import { ExcelTemplateInfo, UploadResult } from '@/types/excel.type';
import { ChangeEvent } from 'react';
import { validateExcelData } from '@/components/excel/utils/validate';
import { exceedsMaxRows, readSheetRows } from '@/components/excel/utils/sheetRows';

export async function processExcelUpload(
  event: ChangeEvent<HTMLInputElement>,
  fileTemplateInfo: ExcelTemplateInfo[],
  maxRows?: number,
): Promise<UploadResult> {
  if (!event.target.files) {
    return {
      success: false,
      errorType: 'UPLOAD_ERROR',
      uploadError: 'NO_FILE_SELECTED',
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
      errorType: 'UPLOAD_ERROR',
      uploadError: 'INVALID_FILE_TYPE',
    };
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      errorType: 'UPLOAD_ERROR',
      uploadError: 'FILE_TOO_LARGE',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 글자 컬럼은 보이는 글자로, 숫자 컬럼은 원래 값으로 읽고 시트 행 번호를 붙인다(sheetRows.ts 참고).
    const rows = readSheetRows(worksheet, fileTemplateInfo);

    if (exceedsMaxRows(rows.length, maxRows)) {
      return { success: false, errorType: 'UPLOAD_ERROR', uploadError: 'TOO_MANY_ROWS' };
    }

    // 필수값 검증 + 허용값 검증. 필수 여부(req)와 허용 목록(allowed)이 모두 양식 정의에 있으므로
    // 헤더만 추려 넘기지 않고 양식 전체를 넘긴다.
    const validationResult = validateExcelData(rows, fileTemplateInfo);

    const success = validationResult.result === 'success';

    if (success && validationResult.errors.length === 0) {
      return { success, data: rows };
    }
    return { success, errorType: 'VALIDATE_ERROR', validationResult, data: rows };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      errorType: 'UPLOAD_ERROR',
      uploadError: 'PROCESSING_ERROR',
    };
  }
}
