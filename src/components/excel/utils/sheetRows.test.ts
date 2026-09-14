import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { ExcelRowType } from '@/types/excel.type';
import { attachSheetRowNumbers, EXCEL_SHEET_ROW_KEY, exceedsMaxRows, getSheetRow } from './sheetRows';

const parse = (aoa: (string | number)[][]): ExcelRowType[] =>
  XLSX.utils.sheet_to_json(XLSX.utils.aoa_to_sheet(aoa), { defval: '' }) as ExcelRowType[];

describe('attachSheetRowNumbers', () => {
  it('헤더가 1행이면 첫 데이터 행은 2행이다', () => {
    const rows = attachSheetRowNumbers(parse([['상품명'], ['A'], ['B']]));

    expect(rows.map(getSheetRow)).toEqual([2, 3]);
  });

  // sheet_to_json은 빈 행을 건너뛴다. index로 계산하면 빈 행 뒤의 번호가 하나씩 밀린다.
  it('중간에 빈 행이 있어도 실제 시트 행 번호를 붙인다', () => {
    const rows = attachSheetRowNumbers(parse([['상품명'], ['A'], [], ['B']]));

    expect(rows.map(getSheetRow)).toEqual([2, 4]);
  });

  // SheetJS의 __rowNum__은 열거 불가 속성이라 펼치면 사라진다. 복사한 필드는 살아남아야 한다.
  it('붙인 번호는 객체를 펼쳐도 남는다', () => {
    const [row] = attachSheetRowNumbers(parse([['상품명'], ['A']]));

    expect(getSheetRow({ ...row, error: [] })).toBe(2);
    expect(Object.keys(row)).toContain(EXCEL_SHEET_ROW_KEY);
  });

  it('__rowNum__이 없거나 null이면 헤더 1행을 가정해 index로 채운다', () => {
    const rows = attachSheetRowNumbers([{ 상품명: 'A' }, { 상품명: 'B', __rowNum__: null }]);

    expect(rows.map(getSheetRow)).toEqual([2, 3]);
  });
});

describe('exceedsMaxRows', () => {
  it('한도와 같으면 통과한다', () => {
    expect(exceedsMaxRows(50, 50)).toBe(false);
  });

  it('한도를 넘으면 거부한다', () => {
    expect(exceedsMaxRows(51, 50)).toBe(true);
  });

  it('한도를 넘기지 않으면 제한이 없다', () => {
    expect(exceedsMaxRows(10_000)).toBe(false);
    expect(exceedsMaxRows(10_000, undefined)).toBe(false);
  });
});
