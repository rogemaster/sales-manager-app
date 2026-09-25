import { NextResponse } from 'next/server';

export const SERVER_ERROR_MESSAGE = '서버 오류가 발생했습니다.';

/**
 * route catch 블록의 500 응답. 원인(DB 오류 등)은 console.error로만 남기고 응답에는 공통 문구만 싣는다 —
 * 쿼리 파라미터가 담긴 오류 메시지가 브라우저로 새지 않게 한다.
 */
export const serverErrorResponse = () => NextResponse.json({ error: SERVER_ERROR_MESSAGE }, { status: 500 });
