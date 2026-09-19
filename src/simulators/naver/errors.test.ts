import { describe, expect, it } from 'vitest';
import { toErrorResponse, toInternalErrorResponse } from './errors';
import type { InvalidInput } from './types';

const NOW = new Date('2026-09-19T00:00:00.000Z');

describe('toErrorResponse', () => {
  it('INVALID는 400 BAD_REQUEST다', () => {
    const { status, body } = toErrorResponse('INVALID', [], NOW);
    expect(status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('DUPLICATE도 400 BAD_REQUEST지만 메시지가 다르다', () => {
    const duplicate = toErrorResponse('DUPLICATE', [], NOW);
    const invalid = toErrorResponse('INVALID', [], NOW);
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.code).toBe('BAD_REQUEST');
    expect(duplicate.body.message).not.toBe(invalid.body.message);
  });

  it('UNAUTHORIZED는 401이다', () => {
    const { status, body } = toErrorResponse('UNAUTHORIZED', [], NOW);
    expect(status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('NOT_FOUND는 404다', () => {
    const { status, body } = toErrorResponse('NOT_FOUND', [], NOW);
    expect(status).toBe(404);
    expect(body.code).toBe('NOT_FOUND');
  });

  it('invalidInputs를 그대로 싣는다', () => {
    const inputs: InvalidInput[] = [{ name: 'name', type: 'REQUIRED', message: '필수입니다.' }];
    expect(toErrorResponse('INVALID', inputs, NOW).body.invalidInputs).toEqual(inputs);
  });

  it('invalidInputs를 넘기지 않으면 빈 배열이다', () => {
    expect(toErrorResponse('UNAUTHORIZED', undefined, NOW).body.invalidInputs).toEqual([]);
  });

  it('timestamp는 ISO 문자열이다', () => {
    expect(toErrorResponse('INVALID', [], NOW).body.timestamp).toBe('2026-09-19T00:00:00.000Z');
  });
});

describe('toInternalErrorResponse', () => {
  it('500 INTERNAL_SERVER_ERROR에 빈 invalidInputs를 준다', () => {
    const { status, body } = toInternalErrorResponse(NOW);
    expect(status).toBe(500);
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.invalidInputs).toEqual([]);
  });
});
