import * as dotenv from 'dotenv';

// db 모듈은 import 시점에 process.env.DATABASE_URL을 읽는다. 정적 import로 올리면
// dotenv보다 먼저 평가될 수 있어(ESM에서는 항상 그렇다) 연결이 undefined로 만들어진다.
// 그래서 환경변수를 먼저 채우고, 아래에서 동적 import로 불러온다.
dotenv.config({ path: '.env.local', quiet: true });

// 사용법: npx tsx scripts/seedProducts.ts <ownerId>
// ownerId를 생략하면 mock 데이터에 적힌 값(usr_2f20748f)을 그대로 쓴다.
const ownerIdOverride = process.argv[2];

const main = async () => {
  const { db } = await import('../src/db');
  const { products } = await import('../src/db/schema');
  const { MOCK_PRODUCT_DATA } = await import('../src/mocks/data/MockProductsData');

  const rows = MOCK_PRODUCT_DATA.map((p) => ({
    ...p,
    ownerId: ownerIdOverride ?? p.ownerId,
  }));

  await db.insert(products).values(rows).onConflictDoNothing();
  console.log(`시드 완료: ${rows.length}건 (ownerId: ${rows[0]?.ownerId})`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
