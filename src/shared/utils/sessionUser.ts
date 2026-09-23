import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';

export interface SessionUserRow {
  id: string;
  ownerId: string | null;
  status: string;
  grade: string;
  email: string;
}

/**
 * 세션 재검증용 사용자 조회. 이 모듈을 분리한 이유는 권한 테스트(routePermissions.test.ts)가 이것만 모킹하고
 * 업무 데이터 접근(@/db)은 계속 막아 두기 위해서다.
 */
export const loadSessionUser = async (id: string): Promise<SessionUserRow | null> => {
  const [row] = await db
    .select({ id: users.id, ownerId: users.ownerId, status: users.status, grade: users.grade, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
};
