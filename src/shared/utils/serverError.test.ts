import { describe, it, expect } from 'vitest';
import { SERVER_ERROR_MESSAGE, serverErrorResponse } from './serverError';

describe('serverErrorResponse', () => {
  it('500과 공통 문구를 돌려준다 — 내부 오류 내용은 응답에 싣지 않는다', async () => {
    const response = serverErrorResponse();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: SERVER_ERROR_MESSAGE });
  });
});
