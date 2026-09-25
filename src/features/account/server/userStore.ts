import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export const EMAIL_TAKEN_MESSAGE = '이미 사용 중인 이메일입니다.';

/** 이메일이 이미 가입·등록돼 있는가. 가입·사용자 등록·중복 확인 route가 같은 조회를 쓴다(이메일은 워크스페이스와 무관하게 전역 유일). */
export const isEmailTaken = async (email: string): Promise<boolean> => {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return existing.length > 0;
};
