import { describe, expect, it } from 'vitest';
import { validateExcelData } from './validate';
import { ExcelTemplateInfo } from '@/types/excel.type';

const template: ExcelTemplateInfo[] = [
  { key: 'name', name: '상품명', req: true },
  { key: 'state', name: '판매상태', req: true, allowed: ['판매중', '판매대기'] },
  { key: 'memo', name: '메모', req: false, allowed: ['A', 'B'] },
];

const row = (over: Record<string, string | number> = {}) => ({ 상품명: '상품', 판매상태: '판매중', 메모: '', ...over });

describe('validateExcelData - 허용값 검사', () => {
  it('허용 목록에 없는 값이면 INVALID_VALUE 오류를 만든다', () => {
    const { errors } = validateExcelData([row({ 판매상태: '판매중지' })], template);

    expect(errors).toContainEqual({
      row: 1,
      header: '판매상태',
      code: 'INVALID_VALUE',
      value: '판매중지',
      allowed: ['판매중', '판매대기'],
    });
  });

  it('허용값 오류만 있으면 미리보기가 가능하도록 success로 판정한다', () => {
    const { result } = validateExcelData([row({ 판매상태: '판매중지' })], template);

    expect(result).toBe('success');
  });

  it('허용 목록에 있는 값이면 오류가 없다', () => {
    const { errors } = validateExcelData([row({ 판매상태: '판매대기' })], template);

    expect(errors).toHaveLength(0);
  });

  it('앞뒤 공백은 무시하고 비교한다', () => {
    const { errors } = validateExcelData([row({ 판매상태: ' 판매중 ' })], template);

    expect(errors).toHaveLength(0);
  });

  it('시트에서 숫자로 파싱된 값도 문자열로 비교한다', () => {
    const numericTemplate: ExcelTemplateInfo[] = [{ key: 'code', name: '코드', req: true, allowed: ['1', '2'] }];

    const { errors } = validateExcelData([{ 코드: 1 }], numericTemplate);

    expect(errors).toHaveLength(0);
  });

  it('필수 컬럼이 비어 있으면 EMPTY_VALUE만 붙이고 허용값 오류를 겹쳐 붙이지 않는다', () => {
    const { errors } = validateExcelData([row({ 판매상태: '' })], template);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('EMPTY_VALUE');
  });

  it('선택 컬럼이 비어 있으면 허용값 검사를 건너뛴다', () => {
    const { errors } = validateExcelData([row({ 메모: '' })], template);

    expect(errors).toHaveLength(0);
  });

  it('허용 목록이 없는 컬럼은 어떤 값이든 통과시킨다', () => {
    const { errors } = validateExcelData([row({ 상품명: '아무 이름' })], template);

    expect(errors).toHaveLength(0);
  });
});

describe('validateExcelData - 기존 필수값 검사', () => {
  it('컬럼 자체가 없으면 MISSING_FIELD이고 미리보기 불가로 판정한다', () => {
    const { result, errors } = validateExcelData([{ 상품명: '상품', 메모: '' }], template);

    expect(result).toBe('error');
    expect(errors).toContainEqual({ row: 1, header: '판매상태', code: 'MISSING_FIELD' });
  });

  it('행 번호는 1부터 센다', () => {
    const { errors } = validateExcelData([row(), row({ 상품명: '' })], template);

    expect(errors[0]).toMatchObject({ row: 2, header: '상품명', code: 'EMPTY_VALUE' });
  });
});

describe('validateExcelData - 숫자 검사', () => {
  const numericTemplate: ExcelTemplateInfo[] = [
    { key: 'name', name: '상품명', req: true },
    { key: 'price', name: '판매가', req: true, numeric: true },
    { key: 'netPrice', name: '공급가', req: false, numeric: true },
  ];

  const numericRow = (over: Record<string, string | number> = {}) => ({
    상품명: '상품',
    판매가: 10000,
    공급가: '',
    ...over,
  });

  it('숫자가 아니면 INVALID_NUMBER 오류를 만든다', () => {
    const { errors } = validateExcelData([numericRow({ 판매가: 'abc' })], numericTemplate);

    expect(errors).toContainEqual({ row: 1, header: '판매가', code: 'INVALID_NUMBER', value: 'abc' });
  });

  it('음수를 잡는다', () => {
    const { errors } = validateExcelData([numericRow({ 판매가: -1 })], numericTemplate);

    expect(errors[0]).toMatchObject({ header: '판매가', code: 'INVALID_NUMBER' });
  });

  it('소수점을 잡는다', () => {
    const { errors } = validateExcelData([numericRow({ 판매가: 1000.5 })], numericTemplate);

    expect(errors[0]).toMatchObject({ header: '판매가', code: 'INVALID_NUMBER' });
  });

  it('숫자 오류만 있으면 미리보기가 가능하도록 success로 판정한다', () => {
    const { result } = validateExcelData([numericRow({ 판매가: 'abc' })], numericTemplate);

    expect(result).toBe('success');
  });

  it('정상 숫자는 통과한다', () => {
    const { errors } = validateExcelData([numericRow()], numericTemplate);

    expect(errors).toHaveLength(0);
  });

  it('문자열로 적힌 숫자도 통과한다', () => {
    const { errors } = validateExcelData([numericRow({ 판매가: ' 10000 ' })], numericTemplate);

    expect(errors).toHaveLength(0);
  });

  it('선택 컬럼이 비어 있으면 검사를 건너뛴다', () => {
    const { errors } = validateExcelData([numericRow({ 공급가: '' })], numericTemplate);

    expect(errors).toHaveLength(0);
  });

  it('필수 컬럼이 비어 있으면 EMPTY_VALUE만 붙이고 숫자 오류를 겹쳐 붙이지 않는다', () => {
    const { errors } = validateExcelData([numericRow({ 판매가: '' })], numericTemplate);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('EMPTY_VALUE');
  });
});
