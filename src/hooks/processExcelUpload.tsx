'use client';

import * as XLSX from 'xlsx';
import { ExcelRowType, validateExcelData, ValidationResult } from '@/lib/excel/validate';
import { ExcelTemplateInfo } from '@/types/ExcelInterface';
import { ChangeEvent } from 'react';

export type UploadResult = {
  ok: boolean;
  validation: ValidationResult;
  data?: unknown;
  message?: string;
};

export async function processExcelUpload(
  event: ChangeEvent<HTMLInputElement>,
  fileTemplateInfo: ExcelTemplateInfo[],
): Promise<UploadResult> {
  if (!event.target.files) {
    return {
      ok: false,
      validation: { result: 'error', errors: [] },
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
      ok: false,
      validation: { result: 'error', errors: [] },
      message: '엑셀 파일(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.',
    };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 엑셀을 이중배열이 아닌 배열 안의 객체 형태(Array of Objects) 로 변형
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('엑셀 jsonData', jsonData);

    // 필수값 헤더 추출
    const requiredHeaders = fileTemplateInfo.filter((data) => data.req).map((data) => data.name);
    console.log('필수값 추출', requiredHeaders);

    // validateSheet 함수 호출 - 필수값 검증
    const validation = validateExcelData(jsonData as ExcelRowType[], requiredHeaders);
    console.log('검증', validation);

    const ok = validation.result === 'success';
    return {
      ok,
      validation,
      data: ok ? jsonData : undefined,
      message: ok ? '업로드가 완료되었습니다.' : undefined,
    };

    // if (!invalidRows.result) {
    //   return {
    //     success: false,
    //     message: `필수값 누락: ${invalidRows.errorHeaders?.join(', ')}`,
    //   };
    // }

    // return {
    //   success: true,
    //   message: '업로드가 완료되었습니다.',
    //   data: jsonData,
    // };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      validation: { result: 'error', errors: [] },
      message: '파일 처리 중 오류가 발생했습니다.',
    };
  }
}
