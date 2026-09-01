# 상품 메인이미지 R2 저장 + 상품 Neon 이전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **진행 상태(2026-09-01):** Task 1~8 완료. `npm run lint`(경고만) / `npx tsc --noEmit` / `npm run test`(32파일 267테스트) / `npm run build` 전부 통과. Neon `products` 시드 20건(`ownerId: usr_2f20748f`) 반영, 사용자가 브라우저에서 업로드·거부·목록·연동 검증 완료.
>
> **Task 6 Step 13(소유권 격리)은 브라우저 대신 자동 검증했다** — `NEXTAUTH_SECRET`으로 다른 `ownerId`의 세션 JWT를 발급해 route에 직접 요청: 소유자 `GET` 200 / 타계정 `GET`·`PATCH` 404 / 소유자가 남의 R2 key를 `mainImage`로 넣으면 400 / 목록 total 21 vs 0.
>
> **모든 Step 검증 완료(55/55).** 마지막까지 남았던 Task 5 Step 8(홈 대시보드 통계·최근 상품, `/shopping/register` 전송)도 사용자가 브라우저에서 확인했다 — MSW가 실 route 어댑터(`fetchProducts.ts`)로 상품을 받아오는 과도기 경로가 정상 동작한다는 뜻이다.
>
> 남은 것은 코드 리뷰 → `/ce-compound` 문서화 → **사용자 승인 후** Task 단위 분리 커밋 → 브랜치 마무리.

**Goal:** 상품 메인이미지를 Cloudflare R2에 저장하고, 상품 데이터를 MSW에서 Neon으로 옮겨 배포된 URL에서 등록한 상품과 이미지가 영속되게 한다.

**Architecture:** 업로드는 서버 경유(`POST /api/products/image`)로 처리해 R2 시크릿을 서버에 가둔다. DB에는 공개 URL이 아니라 R2 key를 저장한다. 상품 5개 엔드포인트를 Next.js route handler로 옮기면서 소유권 판정을 클라이언트 값에서 세션 기반으로 전환한다. MSW에 남는 홈·연동상품은 상품 배열을 인자로 주입받도록 바꾸고, 핸들러가 실 API에서 가져와 넘긴다.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + Neon(postgres), `@aws-sdk/client-s3`(R2 S3 호환 API), NextAuth(JWT), MSW, Vitest, dayjs

**Spec:** `docs/superpowers/specs/2026-09-01-product-image-r2-storage-design.md`

**Branch:** `feat/product-image-r2-storage` (생성 완료)

## Global Constraints

- **커밋은 자동 실행하지 않는다.** `CLAUDE.md`의 Git/PR 규칙에 따라 모든 git 작업은 사용자가 그 시점에 명시적으로 요청할 때만 실행한다. 이 계획에는 Task별 커밋 스텝을 두지 않는다 — 이 프로젝트는 **모든 Task 완료 후 Task 단위로 분리해 커밋**하는 방식을 선호해왔다.
- **테스트 대상은 순수 로직뿐이다.** `CLAUDE.md` 관례상 UI 컴포넌트와 API fetch 래퍼는 테스트 파일을 만들지 않는다. 따라서 TDD 사이클은 Task 1·Task 5에만 적용되고, route·UI Task는 **수동 검증 절차**로 대체한다.
- **`vitest.config.ts`는 수정하지 않는다.** `include`가 없어 기본값으로 전 경로의 `*.test.ts`가 실행된다.
- **폰트 크기·폰트 색상은 변경하지 않는다** (`CLAUDE.md` 스타일 규칙).
- **`src/app/api/.../route.ts` 생성은 원칙적으로 금지**이나, R2 업로드와 상품 DB 접근은 서버 전용 시크릿이 필요해 `msw-rules.md`의 예외에 해당한다 (Task 8에서 규칙 문서에 명시).
- 환경변수 이름은 정확히 `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`. **`NEXT_PUBLIC_` 접두사를 붙이면 번들에 노출된다.**
- R2 키 접두사는 `images` (사용자가 R2에 이미 생성해 둔 폴더).
- 파일 크기 상한은 **4MB**. Vercel 본문 제한 4.5MB 아래 값이다.

---

## 파일 구조

| 파일 | 책임 | Task |
|---|---|---|
| `src/shared/utils/date.ts` | KST 날짜 범위를 반개구간 `Date` 쌍으로 변환 | 1 |
| `src/shared/utils/date.test.ts` | 위 함수의 경계·타임존 테스트 | 1 |
| `src/db/schema.ts` | `products` 테이블 추가 (기존 `users` 유지) | 2 |
| `src/lib/storage.ts` | R2 클라이언트, 키 생성, 업로드 (서버 전용) | 3 |
| `src/shared/constant/upload.constant.ts` | 파일 크기·MIME 상한 (서버·클라이언트 공용) | 3 |
| `src/app/api/products/image/route.ts` | 업로드 엔드포인트 (인증·검증) | 3 |
| `src/features/products/api/uploadProductImage.ts` | 업로드 엔드포인트 fetch 래퍼 | 4 |
| `src/shared/api/uploadImage.ts` | `File | string` → key 합성 | 4 |
| `src/features/products/types/product.types.ts` | `Product.mainImage: string`, `ProductFormValues` 신설 | 4 |
| `src/mocks/utils/fetchProducts.ts` | MSW 핸들러가 실 API에서 상품을 가져오는 어댑터 | 6 |
| `src/app/api/products/list/route.ts` | 목록 조회 | 6 |
| `src/app/api/products/create/route.ts` | 생성 | 6 |
| `src/app/api/products/[productId]/route.ts` | 단건 조회·수정 | 6 |
| `src/app/api/products/bulk/route.ts` | 엑셀 대량 등록 | 6 |
| `scripts/seedProducts.ts` | mock 상품을 Neon에 시드 | 7 |

---

## Task 1: KST 날짜 범위 유틸

목록의 등록일·수정일 필터가 SQL로 넘어가면 경계 계산이 필요해진다. 이 로직은 틀려도 증상이 조용해서(하루 어긋남) 테스트로 고정한다.

**Files:**
- Create: `src/shared/utils/date.ts`
- Test: `src/shared/utils/date.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 Task)
- Produces: `toKstDateRange(startDate: string, endDate: string): { start: Date; endExclusive: Date }` — Task 6의 목록 route가 사용한다. `startDate`·`endDate`는 `'YYYY-MM-DD'` 형식.

- [x] **Step 1: 실패하는 테스트 작성**

`src/shared/utils/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toKstDateRange } from './date';

describe('toKstDateRange', () => {
  it('start는 KST 자정 = UTC 전날 15:00 이다', () => {
    const { start } = toKstDateRange('2026-09-01', '2026-09-01');
    expect(start.toISOString()).toBe('2026-08-31T15:00:00.000Z');
  });

  it('하루짜리 범위는 정확히 24시간이다', () => {
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-01');
    expect(endExclusive.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('끝날짜 당일 오후에 등록된 건이 범위에 포함된다', () => {
    // lte(endDate) 방식이면 여기서 누락된다
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-05');
    const registered = new Date('2026-09-05T14:30:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(registered.getTime()).toBeLessThan(endExclusive.getTime());
  });

  it('KST 오전 8시 등록 건이 그날 범위에 잡힌다', () => {
    // UTC 기준으로 자르면 전날(08-31)로 밀린다
    const { start, endExclusive } = toKstDateRange('2026-09-01', '2026-09-01');
    const registered = new Date('2026-09-01T08:00:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(registered.getTime()).toBeLessThan(endExclusive.getTime());
  });

  it('끝날짜 다음날 00:00 KST는 범위 밖이다', () => {
    const { endExclusive } = toKstDateRange('2026-09-01', '2026-09-05');
    const registered = new Date('2026-09-06T00:00:00+09:00');
    expect(registered.getTime()).toBeGreaterThanOrEqual(endExclusive.getTime());
  });
});
```

- [x] **Step 2: 실패 확인**

```bash
npm run test -- src/shared/utils/date.test.ts
```

예상: `Failed to resolve import "./date"` — 파일이 없어 5개 테스트 전부 실패.

- [x] **Step 3: 최소 구현**

`src/shared/utils/date.ts`:

```ts
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = 'Asia/Seoul';

/**
 * 'YYYY-MM-DD' 두 개를 KST 기준 반개구간 [start, endExclusive) 으로 바꾼다.
 *
 * 끝날짜를 그대로 lte 비교에 쓰면 그 날 00:00 으로 해석되어
 * 끝날짜 당일에 등록된 건이 통째로 누락된다. 그래서 다음날 자정을 배타 경계로 쓴다.
 * 서버(Vercel)는 UTC로 돌기 때문에 경계를 반드시 KST로 만들어야
 * 자정~오전 9시 사이 등록 건이 하루 밀리지 않는다.
 */
export const toKstDateRange = (startDate: string, endDate: string): { start: Date; endExclusive: Date } => ({
  start: dayjs.tz(startDate, KST).startOf('day').toDate(),
  endExclusive: dayjs.tz(endDate, KST).startOf('day').add(1, 'day').toDate(),
});
```

- [x] **Step 4: 통과 확인**

```bash
npm run test -- src/shared/utils/date.test.ts
```

예상: 5 passed.

- [x] **Step 5: 전체 테스트 회귀 확인**

```bash
npm run test
```

예상: 기존 테스트 전부 통과 + 새 5개 통과.

---

## Task 2: `products` 테이블 스키마

**Files:**
- Modify: `src/db/schema.ts` (기존 `users` 테이블 아래에 추가)

**Interfaces:**
- Consumes: 없음
- Produces: `products` 테이블 객체. Task 6의 route 4개와 Task 7의 시드 스크립트가 `import { products } from '@/db/schema'`로 사용한다. 컬럼 이름은 아래 정의를 그대로 따른다.

**주의:** 이 프로젝트에는 `drizzle/` 마이그레이션 디렉토리가 없다. `users` 테이블은 마이그레이션 파일 없이 반영된 상태이므로, 이번에도 `drizzle-kit push`로 스키마를 직접 반영한다.

- [x] **Step 1: 스키마 추가**

`src/db/schema.ts` 상단 import를 확장하고 파일 끝에 테이블을 추가한다.

```ts
import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { OptionCombination, ProductInformationDisclosure } from '@/features/products/types/product.types';
```

```ts
export const products = pgTable('products', {
  productId: text('product_id').primaryKey(),
  ownerId: text('owner_id').notNull(),

  // 목록 검색·정렬·페이징에 쓰이는 값들
  name: text('name').notNull(),
  categoryId: text('category_id').notNull(),
  state: text('state').notNull(),
  createDate: timestamp('create_date', { withTimezone: true }).notNull(),
  updateDate: timestamp('update_date', { withTimezone: true }).notNull(),

  customerCode: text('customer_code'),
  price: integer('price').notNull(),
  netPrice: integer('net_price'),
  deliveryType: text('delivery_type').notNull(),
  deliveryPrice: integer('delivery_price').notNull(),
  totalQuantity: integer('total_quantity').notNull(),

  /**
   * 메인이미지. 두 형태가 들어온다 — 표시할 때는 반드시 URL 조립 함수를 거친다.
   *  - R2 key   `images/<ownerId>/<uuid>.png`  화면에서 직접 업로드한 이미지
   *  - 절대 URL `https://...`                  엑셀 대량등록의 외부 이미지, 시드 데이터
   * 이 합집합은 실수가 아니라 선택된 계약이다(스펙 4.2). key로 통일하려 하지 말 것.
   * 현재 라운드에는 표시 코드가 없어 분기 자체가 존재하지 않는다.
   */
  mainImage: text('main_image').notNull(),

  detailPage: text('detail_page').notNull(),
  brand: text('brand').notNull(),
  manufacturer: text('manufacturer').notNull(),
  modelName: text('model_name'),
  modelId: text('model_id'),
  originCountryCode: text('origin_country_code'),
  originCountryEtc: text('origin_country_etc'),
  taxType: text('tax_type'),
  adultProductType: text('adult_product_type'),

  // 중첩 구조 — 목록 검색 조건에 등장하지 않아 통째로 읽고 통째로 쓴다
  option: jsonb('option').$type<OptionCombination[]>(),
  subOption: jsonb('sub_option').$type<OptionCombination[]>(),
  keyWords: jsonb('key_words').$type<string[]>(),
  informationDisclosure: jsonb('information_disclosure').$type<ProductInformationDisclosure>().notNull(),
});
```

- [x] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

예상: 에러 없음. (에러가 나면 `OptionCombination`·`ProductInformationDisclosure`의 export 여부를 먼저 확인한다 — 둘 다 `product.types.ts`에 `export`되어 있다.)

- [x] **Step 3: 스키마를 Neon에 반영**

```bash
npx drizzle-kit push
```

예상: `products` 테이블 생성. `users`에 대한 변경은 없어야 한다.

**출력에 `users` 관련 ALTER/DROP이 보이면 중단하고 사용자에게 보고한다.** 대화형 확인을 요구하면 사용자가 `! npx drizzle-kit push`로 직접 실행한다.

- [x] **Step 4: 반영 확인**

```bash
npx drizzle-kit push --verbose
```

예상: `No changes detected` (이미 반영되어 diff 없음).

---

## Task 3: R2 스토리지 모듈 + 업로드 route

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/shared/constant/upload.constant.ts`
- Create: `src/app/api/products/image/route.ts`
- Modify: `.env.local` (R2 환경변수 4개 추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `PRODUCT_IMAGE_PREFIX: 'images'`
  - `buildImageKey(prefix: string, ownerId: string, originalName: string): string`
  - `putImage(key: string, body: Buffer, contentType: string): Promise<void>`
  - `MAX_IMAGE_BYTES: number`, `ALLOWED_IMAGE_MIME: readonly string[]`
  - `POST /api/products/image` → `200 { key: string }`. Task 4가 이 응답을 소비한다.

- [x] **Step 1: 의존성 설치**

```bash
npm install @aws-sdk/client-s3 server-only
```

R2 전용 SDK는 존재하지 않는다. R2는 S3 호환 API를 제공하므로 S3 SDK를 그대로 쓴다.

> `CLAUDE.md`의 "소프트웨어 설치 금지"는 `npm install -g`·`winget` 같은 **시스템 전역 변경**을 막는 규칙이다. 프로젝트 로컬 의존성 추가는 이 계획의 승인 범위에 포함된다.

- [x] **Step 2: 환경변수 추가**

`.env.local`에 4줄을 추가한다. 값은 Cloudflare 대시보드의 R2 → API 토큰에서 발급한다.

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

`NEXT_PUBLIC_` 접두사를 붙이면 클라이언트 번들에 노출된다. 붙이지 않는다.
공개 URL 관련 변수(`NEXT_PUBLIC_R2_PUBLIC_URL`)는 이번 라운드에 **추가하지 않는다** — 읽는 코드가 없다.

- [x] **Step 3: 공용 상수 작성**

`src/shared/constant/upload.constant.ts`:

```ts
// Vercel 서버리스 함수의 요청 본문 제한이 4.5MB다. 그 아래로 여유를 둔다.
// 초과 요청은 route에 도달하기 전에 플랫폼이 413으로 끊으므로,
// 클라이언트가 파일 선택 시점에 먼저 검사해야 사용자가 의미 있는 메시지를 본다.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// 기존 `acceptImage`(src/constant/accept.content.ts)와 같은 목록이어야 한다.
export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg'] as const;
```

- [x] **Step 4: 스토리지 모듈 작성**

`src/lib/storage.ts`:

```ts
import 'server-only';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// R2는 리전 개념이 없어 'auto'를 쓴다. 엔드포인트는 계정별 고정 주소다.
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const PRODUCT_IMAGE_PREFIX = 'images';

/**
 * 키 형태: `<prefix>/<ownerId>/<uuid>.<ext>`
 * 원본 파일명을 쓰지 않는 이유: 한글·공백·중복이 그대로 키가 된다.
 * ownerId를 넣는 이유: 키만 보고 테넌트를 구분할 수 있고 계정 단위 정리가 가능하다.
 */
export const buildImageKey = (prefix: string, ownerId: string, originalName: string): string => {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
  return `${prefix}/${ownerId}/${uuidv4()}.${ext}`;
};

/**
 * R2는 객체 단위 ACL을 지원하지 않는다. `ACL: 'public-read'`를 넣으면 요청이 거부된다.
 * 공개 여부는 버킷 설정으로 정한다.
 */
export const putImage = async (key: string, body: Buffer, contentType: string): Promise<void> => {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
};
```

> **⚠️ 위 `buildImageKey` 코드에는 결함이 있다 (2026-09-01 리뷰에서 발견, 수정 완료).**
> `originalName.split('.').pop()?.toLowerCase() || 'bin'`에서 `'noext'.split('.')`는 `['noext']`라 `.pop()`이
> `undefined`가 아니다. **점 없는 파일명은 `|| 'bin'`에 걸리지 않고 이름 전체가 확장자로 키에 들어간다** —
> 함수 자신의 주석과 모순되고, 2000자 이름은 R2 키 한도(1024바이트)를 넘겨 불투명한 500이 된다.
>
> 실제 구현은 **매직넘버로 판별한 실제 타입에서 확장자를 뽑는다.** `hasImageSignature`는
> `detectImageType(buffer): { ext: 'png' | 'jpg'; contentType: 'image/png' | 'image/jpeg' } | null`이 되고,
> `buildImageKey`의 세 번째 인자는 `originalName`이 아니라 그 `ext`를 받는다(타입이 리터럴 유니온이라
> 사용자 입력이 키에 닿을 경로가 타입 레벨에서 없어진다). `putImage`의 `contentType`도 클라이언트가
> 선언한 `file.type`이 아니라 감지된 값을 쓴다. 최종 코드는 `src/lib/storage.ts`를 볼 것.

- [x] **Step 5: 업로드 route 작성**

`src/app/api/products/image/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { buildImageKey, putImage, PRODUCT_IMAGE_PREFIX } from '@/lib/storage';
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from '@/shared/constant/upload.constant';

// file.type은 브라우저가 보낸 값이라 위조된다. 실제 바이트로 한 번 더 확인한다.
const hasImageSignature = (buffer: Buffer): boolean => {
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  return isPng || isJpeg;
};

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
      return NextResponse.json({ error: 'PNG 또는 JPG 이미지만 업로드할 수 있습니다.' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '4MB 이하 이미지를 업로드해 주세요.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasImageSignature(buffer)) {
      return NextResponse.json({ error: '이미지 파일이 아닙니다.' }, { status: 400 });
    }

    const key = buildImageKey(PRODUCT_IMAGE_PREFIX, session.ownerId, file.name);
    await putImage(key, buffer, file.type);

    return NextResponse.json({ key });
  } catch (error) {
    console.error('이미지 업로드 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [x] **Step 6: 수동 검증 — 인증 차단**

개발 서버를 띄우고 로그아웃 상태에서 호출한다.

```bash
npm run dev
```

브라우저 콘솔(로그아웃 상태):

```js
await fetch('/api/products/image', { method: 'POST', body: new FormData() }).then(r => r.status)
```

예상: `401`

- [x] **Step 7: 수동 검증 — 업로드 성공**

로그인한 뒤 브라우저 콘솔에서 `<input type="file">`로 고른 PNG를 보낸다.

```js
const fd = new FormData();
fd.append('file', document.querySelector('input[type=file]').files[0]);
await fetch('/api/products/image', { method: 'POST', body: fd }).then(r => r.json())
```

예상: `{ key: "images/usr_xxxxxxxx/<uuid>.png" }`

**Cloudflare 대시보드 → R2 → 버킷 → `images/` 아래에 해당 객체가 생겼는지 확인한다.**

- [x] **Step 8: 수동 검증 — 검증 거부**

`.txt` 파일을 확장자만 `.png`로 바꿔 올린다.

예상: `400`, `{ error: 'PNG 또는 JPG 이미지만 업로드할 수 있습니다.' }` (MIME에서 걸림)

MIME까지 조작해 보낼 경우 매직 넘버에서 `{ error: '이미지 파일이 아닙니다.' }`로 걸린다.

> **확인 완료(2026-09-01):** AWS SDK v3 체크섬 이슈는 **재현되지 않았다.** `@aws-sdk/client-s3@3.1121.0`으로 실제 버킷에 1x1 PNG를 PUT → HEAD(`image/png`, 70 bytes) → DELETE까지 성공했다. `requestChecksumCalculation` 옵션은 넣지 않는다.
>
> **Step 6 검증 완료:** 세션 없이 `POST /api/products/image`, `POST /api/products/list` 둘 다 `401 {"error":"로그인이 필요합니다."}`.
>
> **Step 7·8은 미검증:** 로그인 세션 쿠키가 필요해 브라우저에서 사용자가 직접 확인해야 한다. 스토리지 계층(실제 PUT 성공)과 인증 게이트(401)는 각각 따로 검증됐고, 남은 것은 둘을 잇는 브라우저 경로다.

---

## Task 4: `Product` 타입 정리 + 폼 배선

이미지가 서버에 도달하지 않던 근본 원인(`JSON.stringify(File)` → `{}`)을 타입 정리로 해소한다.

**Files:**
- Modify: `src/features/products/types/product.types.ts:14` (`mainImage` 타입), 파일 하단에 `ProductFormValues` 추가
- Create: `src/features/products/api/uploadProductImage.ts`
- Create: `src/shared/api/uploadImage.ts`
- Modify: `src/features/products/ui/create/ProductCreateLayout.tsx`
- Modify: `src/features/products/ui/[id]/ProductModifyLayout.tsx`
- Modify: `src/features/products/ui/components/form/ProductMainImageInfo.tsx`
- Modify: `src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts:12` (주석만)

**Interfaces:**
- Consumes: `POST /api/products/image` → `{ key: string }` (Task 3)
- Produces:
  - `Product.mainImage: string` — Task 6의 route와 Task 7의 시드가 이 타입을 전제한다
  - `ProductFormValues` — `Omit<Product, 'mainImage'> & { mainImage: File | string }`
  - `resolveMainImageKey(value: File | string): Promise<string>`

- [x] **Step 1: 도메인 타입 수정**

`src/features/products/types/product.types.ts` 14번 줄:

```ts
  // 변경 전: mainImage: string | File;
  /**
   * 메인이미지. R2 key(`images/<ownerId>/<uuid>.png`) 또는 절대 URL(엑셀·시드의 외부 이미지).
   * 폼에서 File을 다루는 것은 ProductFormValues의 역할이다 — 도메인 타입에는 File이 들어오지 않는다.
   */
  mainImage: string;
```

같은 파일 하단(`CreateProductRequest` 근처)에 추가:

```ts
/**
 * 상품 폼이 다루는 값. mainImage만 도메인 타입과 다르다.
 * 등록 화면은 File을, 수정 화면은 서버에서 받은 기존 값(string)을 들고 있다가
 * 사용자가 파일을 고르면 File로 바뀐다. 이 유니온은 폼에서만 정당하다.
 */
export type ProductFormValues = Omit<Product, 'mainImage'> & {
  mainImage: File | string;
};
```

- [x] **Step 2: 업로드 fetch 래퍼 작성**

`src/features/products/api/uploadProductImage.ts`:

```ts
export const uploadProductImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // Content-Type을 직접 지정하면 boundary가 빠져 서버가 파싱하지 못한다. 브라우저가 붙이게 둔다.
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: '이미지 업로드 실패' }));
    throw new Error(error);
  }

  const { key } = (await response.json()) as { key: string };
  return key;
};
```

- [x] **Step 3: 합성 함수 작성**

`src/shared/api/uploadImage.ts`:

```ts
import { uploadProductImage } from '@/features/products/api/uploadProductImage';

/**
 * 폼 값이 File이면 업로드해서 key를 받고, 이미 문자열이면 그대로 쓴다.
 * 수정 화면에서 이미지를 바꾸지 않은 경우가 후자다.
 */
export const resolveMainImageKey = async (value: File | string): Promise<string> =>
  typeof value === 'string' ? value : uploadProductImage(value);
```

- [x] **Step 4: 등록 화면 배선**

`src/features/products/ui/create/ProductCreateLayout.tsx`:

```tsx
// import 추가
import { ProductFormValues } from '../../types/product.types';
import { resolveMainImageKey } from '@/shared/api/uploadImage';

// useForm<Product>() → useForm<ProductFormValues>()
const formData = useForm<ProductFormValues>();

const { mutate } = useMutation({
  mutationFn: async (data: ProductFormValues) => {
    // 업로드는 제출 시점에만 일어난다. 파일만 고르고 이탈하면 R2에 아무것도 남지 않는다.
    const mainImage = await resolveMainImageKey(data.mainImage);
    return createProduct({ ...data, mainImage }, workspaceOwnerId);
  },
  onSuccess: () => { /* 기존 그대로 */ },
  onError: () => { /* 기존 그대로 */ },
});

const onSubmit: SubmitHandler<ProductFormValues> = (data) => {
  if (!data.mainImage) {
    formData.setError('mainImage', { type: 'manual', message: '메인이미지를 선택해 주세요.' });
  } else {
    mutate(data);
  }
};
```

- [x] **Step 5: 수정 화면 배선**

`src/features/products/ui/[id]/ProductModifyLayout.tsx` — 등록 화면과 같은 방식으로 바꾼다.

```tsx
import { ProductFormValues } from '../../types/product.types';
import { resolveMainImageKey } from '@/shared/api/uploadImage';

const formData = useForm<ProductFormValues>();

const { mutate } = useMutation({
  mutationFn: async (data: ProductFormValues) => {
    const mainImage = await resolveMainImageKey(data.mainImage);
    return updateProduct(productId, { ...data, mainImage }, workspaceOwnerId);
  },
  onSuccess: () => { /* 기존 그대로 */ },
  onError: () => { /* 기존 그대로 */ },
});

const onSubmit: SubmitHandler<ProductFormValues> = (data) => {
  mutate(data);
};
```

`formData.reset(queryData)`는 서버가 준 문자열이 들어오므로 그대로 둔다.

> **⚠️ 위 두 Step의 `onError: () => { /* 기존 그대로 */ }`는 잘못된 지시였다 (2026-09-01 리뷰에서 발견, 수정 완료).**
> 이 Task가 업로드라는 **새로운 실패 모드**(인증 401 / 형식·용량 400 / CSRF 403 / R2 미설정 500)를 도입하는데,
> `onError`가 던져진 에러를 버리고 `'상품등록 실패'` 한 줄만 띄우면 그 전부가 저장 실패와 구분되지 않는다.
> 특히 R2 자격증명이 틀렸을 때 원인을 짚을 단서가 화면에 하나도 남지 않는다.
>
> 실제 구현은 서버 메시지를 노출한다:
> ```ts
> onError: (error) => {
>   showAlert({ type: 'error', message: error instanceof Error && error.message ? error.message : '상품등록 실패' });
> },
> ```
> 수정 화면은 fallback이 `'상품수정 실패'`다. 업로드 route가 반환하는 5개 메시지가 전부 사용자용 한국어라
> 그대로 노출해도 내부 정보가 새지 않는다 — 향후 내부 정보를 담은 메시지를 추가한다면 이 전제를 다시 볼 것.

- [x] **Step 6: 이미지 컴포넌트 — 타입 교체 + 크기 선검사**

`src/features/products/ui/components/form/ProductMainImageInfo.tsx`:

```tsx
// import 교체
import { ProductFormValues } from '@/features/products/types/product.types';
import { MAX_IMAGE_BYTES } from '@/shared/constant/upload.constant';

const {
  setValue,
  formState: { errors },
  clearErrors,
  setError,
} = useFormContext<ProductFormValues>();

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) return;

  // 4.5MB를 넘으면 Vercel이 route 도달 전에 413으로 끊어 사용자가 원인을 알 수 없다.
  // 여기서 먼저 막아 의미 있는 메시지를 보여준다. 서버 검증은 그대로 유지된다.
  if (file.size > MAX_IMAGE_BYTES) {
    setError('mainImage', { type: 'manual', message: '4MB 이하 이미지를 업로드해 주세요.' });
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    setMainImages({ dataUrl: reader.result as string, file });
  };
  reader.readAsDataURL(file);
  setValue('mainImage', file);
  clearErrors('mainImage');
};
```

나머지(드래그·드롭, 미리보기, 제거 버튼)는 그대로 둔다. **기존 이미지 미리보기는 이번 범위가 아니다.**

- [x] **Step 7: 일괄수정 주석 갱신**

`src/features/mallLinkedProduct/constant/productBulkEdit.constants.ts:12` 부근의 주석에서 "폼이 File을 들고 있어서"라는 사유를 바꾼다. 그 이유는 이번 Task로 사라졌다.

```ts
 * mainImage도 의도적으로 빠져 있다. 타입상으로는 이제 가능하지만(폼의 File 유니온이 제거됨),
 * "N개 상품에 같은 이미지를 넣는다"가 원하는 동작인지 확인된 바 없어 제외를 유지한다.
```

- [x] **Step 8: 타입 체크**

```bash
npx tsc --noEmit
```

예상: 에러 없음. `mainImage`가 `string | File`이던 것을 전제한 코드가 남아 있으면 여기서 드러난다.

- [x] **Step 9: 수동 검증**

`npm run dev` 후 상품 등록 화면에서 이미지를 고르고 등록한다.

- 네트워크 탭에 `POST /api/products/image` → `200 { key: ... }`
- 이어서 `POST /api/products/create`의 요청 본문에 `"mainImage": "images/usr_.../....png"`
- **Cloudflare 대시보드에 객체가 생겼는지 확인**

> 이 시점에는 MSW 핸들러가 아직 살아 있어 저장된 값은 faker URL로 덮어써진다. Task 6에서 해소된다. 여기서 확인할 것은 **업로드가 되고 key가 요청에 실린다**는 것까지다.

---

## Task 5: MSW util 주입 리팩터 (동작 무변화)

Task 6에서 상품이 Neon으로 가면 브라우저에서 도는 MSW는 상품을 읽을 수 없다. 그 전에 **시그니처만 먼저 바꿔** 리뷰 단위를 분리한다. 이 Task를 마쳐도 앱 동작은 완전히 동일하다 — 핸들러가 여전히 `MOCK_PRODUCT_DATA`를 넘기기 때문이다.

**Files:**
- Modify: `src/mocks/utils/getHomeData.ts`
- Modify: `src/mocks/utils/verifyOwnership.ts`
- Modify: `src/mocks/utils/createMallLinkedProducts.ts`
- Modify: `src/mocks/handlers/home.ts`
- Modify: `src/mocks/handlers/mallLinkedProducts.ts`
- Test: `src/mocks/utils/getHomeData.test.ts`, `verifyOwnership.test.ts`, `createMallLinkedProducts.test.ts`, `getProducts.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces (Task 6이 이 시그니처에 상품 배열을 넘긴다):
  - `getMockHomeStats(products: Product[], ownerId: string): HomeStats`
  - `getMockRecentProducts(products: Product[], ownerId: string): RecentProduct[]`
  - `areProductsOwnedBy(productIds: string[], requestOwnerId: string | null, products: Product[]): boolean`
  - `areMallLinkRequestsOwnedBy(items: MallLinkedProductRequestItem[], requestOwnerId: string | null, products: Product[]): boolean`
  - `createMockMallLinkedProducts(items, ownerId, createdByEmail, products: Product[]): CreateMallLinkedProductsResult`

- [x] **Step 1: 테스트를 새 시그니처로 먼저 고친다 (실패 상태 만들기)**

`src/mocks/utils/getHomeData.test.ts`에서 `vi.mock('../data/MockProductsData', ...)` 줄을 삭제하고, 호출부를 인자 전달로 바꾼다.

```ts
// 삭제: vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

// 호출부 변경 예
expect(getMockHomeStats(PRODUCTS, 'usr_a').total).toBe(2);
expect(getMockRecentProducts(PRODUCTS, 'usr_a')).toHaveLength(2);
```

`createMallLinkedProducts.test.ts`·`verifyOwnership.test.ts`도 같은 방식으로 `vi.mock`을 지우고 `PRODUCTS`를 마지막 인자로 넘긴다.

```ts
// createMallLinkedProducts.test.ts
const result = createMockMallLinkedProducts(items, 'usr_a', 'seller@shop.com', PRODUCTS);

// verifyOwnership.test.ts
expect(areProductsOwnedBy(['prod_1'], 'usr_a', PRODUCTS)).toBe(true);
expect(areMallLinkRequestsOwnedBy(items, 'usr_a', PRODUCTS)).toBe(true);
```

`getProducts.test.ts`는 Task 6에서 파일째 삭제되므로 **이 Task에서는 건드리지 않는다.**

- [x] **Step 2: 실패 확인**

```bash
npm run test -- src/mocks/utils
```

예상: 인자 개수 불일치로 타입 에러 또는 assertion 실패. `getHomeData`·`verifyOwnership`·`createMallLinkedProducts` 관련 테스트가 실패한다.

- [x] **Step 3: `getHomeData.ts` 수정**

```ts
import dayjs from 'dayjs';
import { Product } from '@/features/products/types/product.types';
import { HomeStats, RecentProduct } from '@/features/home/types/home.types';

// MOCK_PRODUCT_DATA import 제거 — 상품은 호출자가 넘긴다.
// 상품이 Neon으로 이전되어 브라우저에서 도는 MSW가 직접 읽을 수 없기 때문이다.

export const getMockHomeStats = (products: Product[], ownerId: string): HomeStats => {
  const owned = products.filter((p) => p.ownerId === ownerId);
  const total = owned.length;
  const onSale = owned.filter((p) => p.state === 'ON_SALE').length;
  const soldOut = owned.filter((p) => p.state === 'SOLD_OUT').length;
  const saleDis = owned.filter((p) => p.state === 'SALE_DIS').length;
  const waitSale = owned.filter((p) => p.state === 'WAIT_SALE').length;

  return { total, onSale, soldOut, saleDis, waitSale };
};

export const getMockRecentProducts = (products: Product[], ownerId: string): RecentProduct[] => {
  return products
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => dayjs(b.createDate).valueOf() - dayjs(a.createDate).valueOf())
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      name: p.name,
      price: p.price,
      state: p.state,
      createDate: dayjs(p.createDate).format('YYYY-MM-DD'),
    }));
};
```

- [x] **Step 4: `verifyOwnership.ts` 수정**

`MOCK_PRODUCT_DATA` import를 지우고 두 함수에 인자를 추가한다. 나머지 함수(`isOwnerMatch`, `allOwnedBy`, `areLinkedProductsOwnedBy`)는 그대로 둔다.

```ts
import { Product } from '@/features/products/types/product.types';

// Product는 식별자 필드명이 `productId`라 allOwnedBy(제네릭 제약: `id`)를 그대로 쓸 수 없어 별도 헬퍼로 둔다.
// 상품 목록은 호출자가 넘긴다 — 상품이 Neon에 있어 MSW가 직접 읽을 수 없다.
export const areProductsOwnedBy = (
  productIds: string[],
  requestOwnerId: string | null,
  products: Product[],
): boolean =>
  productIds.every((productId) => {
    const product = products.find((p) => p.productId === productId);
    return !!product && isOwnerMatch(product.ownerId, requestOwnerId);
  });

export const areMallLinkRequestsOwnedBy = (
  items: MallLinkedProductRequestItem[],
  requestOwnerId: string | null,
  products: Product[],
): boolean => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const settingIds = [...new Set(items.map((item) => item.shoppingSettingId))];

  return (
    areProductsOwnedBy(productIds, requestOwnerId, products) &&
    allOwnedBy(settingIds, requestOwnerId, MOCK_SHOPPING_SETTINGS_DATA)
  );
};
```

- [x] **Step 5: `createMallLinkedProducts.ts` 수정**

`MOCK_PRODUCT_DATA` import를 지우고 네 번째 인자를 추가한다.

```ts
export const createMockMallLinkedProducts = (
  items: MallLinkedProductRequestItem[],
  ownerId: string,
  createdByEmail: string,
  products: Product[],
): CreateMallLinkedProductsResult => {
  // ...
  items.forEach((item) => {
    const product = products.find((p) => p.productId === item.productId);
    // 이하 기존 로직 그대로
```

`Product` 타입 import를 추가한다.

- [x] **Step 6: 핸들러가 `MOCK_PRODUCT_DATA`를 넘기도록 임시 배선**

`src/mocks/handlers/home.ts`:

```ts
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';

// ...
return HttpResponse.json(getMockHomeStats(MOCK_PRODUCT_DATA, ownerId));
// ...
return HttpResponse.json(getMockRecentProducts(MOCK_PRODUCT_DATA, ownerId));
```

`src/mocks/handlers/mallLinkedProducts.ts` 37·41번 줄:

```ts
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';

if (!areMallLinkRequestsOwnedBy(items, ownerId, MOCK_PRODUCT_DATA)) {
// ...
return HttpResponse.json(createMockMallLinkedProducts(items, ownerId, createdByEmail, MOCK_PRODUCT_DATA));
```

이 배선은 Task 6에서 `fetchProductsForMock()`으로 교체된다. 여기서는 **동작을 바꾸지 않는 것이 목적**이다.

- [x] **Step 7: 통과 확인**

```bash
npm run test
```

예상: 전체 통과. `vi.mock` 제거로 테스트가 짧아진 것 외에 동작 변화는 없다.

- [x] **Step 8: 수동 회귀 확인**

`npm run dev` 후:
- 홈 대시보드의 상품 통계·최근 상품이 이전과 동일하게 보이는지
- `/shopping/register`에서 상품을 골라 전송했을 때 연동이 정상 생성되는지

---

## Task 6: products API Neon 이전

route 4개를 만들고 MSW 상품 핸들러를 제거한다. **두 작업은 반드시 함께 이뤄져야 한다** — MSW 핸들러가 살아 있으면 요청을 가로채 route가 호출되지 않는다.

**Files:**
- Create: `src/app/api/products/list/route.ts`
- Create: `src/app/api/products/create/route.ts`
- Create: `src/app/api/products/[productId]/route.ts`
- Create: `src/app/api/products/bulk/route.ts`
- Create: `src/mocks/utils/fetchProducts.ts`
- Delete: `src/mocks/handlers/products.ts`, `src/mocks/utils/getProducts.ts`, `src/mocks/utils/getProducts.test.ts`, `src/mocks/utils/createProduct.ts`, `src/mocks/utils/updateProduct.ts`
- Modify: `src/mocks/handlers.ts` (spread 제거), `src/mocks/data/MockProductsData.ts` (역할 주석), `src/mocks/handlers/home.ts`, `src/mocks/handlers/mallLinkedProducts.ts`
- Modify: `src/features/products/api/getProducts.ts`, `createProduct.ts`, `getProduct.ts`, `updateProduct.ts`, `bulkCreateProducts.ts`
- Modify: `src/features/products/store/table.store.ts`

**Interfaces:**
- Consumes: `toKstDateRange` (Task 1), `products` 테이블 (Task 2), `Product` 타입 (Task 4), 주입 시그니처 (Task 5)
- Produces: 5개 엔드포인트. 응답 형태는 기존 MSW와 동일하게 유지한다 — `list`는 `{ products, total, page, pageSize, totalPages }`, `create`/`[productId]`는 `Product`, `bulk`는 `{ success, count }`.

- [x] **Step 1: 목록 route 작성**

`src/app/api/products/list/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { ProductSearch } from '@/features/products/types/product.types';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    const { page, pageSize, dateType, startDate, endDate, saleType, categoryId, searchType, searchValue } =
      (await req.json()) as ProductSearch & { page: number; pageSize: number };

    const conditions = [eq(products.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'update' ? products.updateDate : products.createDate;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (saleType && saleType !== 'ALL') conditions.push(eq(products.state, saleType));
    if (categoryId && categoryId !== 'ALL') conditions.push(eq(products.categoryId, categoryId));
    if (searchValue) {
      const col = searchType === 'productName' ? products.name : products.productId;
      conditions.push(ilike(col, `%${searchValue}%`));
    }

    const where = and(...conditions);

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(products).where(where);

    const rows = await db
      .select()
      .from(products)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ products: rows, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('상품 목록 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [x] **Step 2: 생성 route 작성**

`src/app/api/products/create/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { generatorProductCode } from '@/utils/codeGenerator';
import { CreateProductRequest } from '@/features/products/types/product.types';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const data = (await req.json()) as CreateProductRequest;
    const now = new Date();

    // mainImage는 클라이언트가 보낸 R2 key를 그대로 저장한다.
    // (구 MSW 구현은 여기서 faker URL로 덮어써 업로드한 이미지를 버리고 있었다)
    const [created] = await db
      .insert(products)
      .values({
        ...data,
        productId: generatorProductCode(),
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })
      .returning();

    return NextResponse.json(created);
  } catch (error) {
    console.error('상품 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [x] **Step 3: 단건 조회·수정 route 작성**

`src/app/api/products/[productId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { Product } from '@/features/products/types/product.types';

type Context = { params: Promise<{ productId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { productId } = await params;

  // 소유자 조건을 WHERE에 함께 넣는다. 남의 상품이면 0건이 되어 404가 나가고,
  // 존재 여부 자체가 노출되지 않는다.
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.productId, productId), eq(products.ownerId, session.ownerId)))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const { productId } = await params;

  try {
    const update = (await req.json()) as Partial<Product>;

    // productId·ownerId·createDate는 수정 대상이 아니다. 요청에 섞여 와도 무시한다.
    const { productId: _pid, ownerId: _oid, createDate: _cd, ...patch } = update;

    const [updated] = await db
      .update(products)
      .set({ ...patch, updateDate: new Date() })
      .where(and(eq(products.productId, productId), eq(products.ownerId, session.ownerId)))
      .returning();

    if (!updated) return new NextResponse(null, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('상품 수정 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [x] **Step 4: 대량 등록 route 작성**

`src/app/api/products/bulk/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { Product } from '@/features/products/types/product.types';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { products: rows } = (await req.json()) as { products: Omit<Product, 'ownerId'>[] };

    if (rows.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const now = new Date();

    // 다중 행 insert는 한 문장이라 원자적이다.
    // (neon-http 드라이버는 db.transaction()을 지원하지 않지만 여기서는 필요 없다)
    await db.insert(products).values(
      rows.map((p) => ({
        ...p,
        ownerId: session.ownerId,
        createDate: now,
        updateDate: now,
      })),
    );

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('상품 대량 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
```

- [x] **Step 5: MSW 상품 핸들러·util 삭제**

```bash
rm src/mocks/handlers/products.ts
rm src/mocks/utils/getProducts.ts src/mocks/utils/getProducts.test.ts
rm src/mocks/utils/createProduct.ts src/mocks/utils/updateProduct.ts
```

`src/mocks/handlers.ts`에서 `productHandlers` import와 spread를 제거한다.

- [x] **Step 6: `MockProductsData.ts`에 역할 주석 추가**

파일 최상단에 추가한다. 적지 않으면 다음에 보는 사람이 "왜 상품이 두 군데 있지"로 읽는다.

```ts
/**
 * 연동상품 mock 시드 전용 픽스처.
 *
 * 상품 데이터의 정본은 Neon의 products 테이블이다(2026-09-01 이전 완료).
 * 이 배열이 남아 있는 이유는 MockMallLinkedProductsData가 모듈 로드 시점에
 * 동기로 스냅샷을 복사해야 하기 때문이다 — 그 시점에는 fetch를 쓸 수 없다.
 * 스냅샷은 복사본이라 복사가 끝나면 원본 테이블이 필요 없다.
 *
 * 상품 목록·검색·등록은 이 배열을 보지 않는다. 여기에 상품을 추가해도 화면에 나오지 않는다.
 */
```

- [x] **Step 7: 상품 조회 어댑터 작성**

`src/mocks/utils/fetchProducts.ts`:

```ts
import { Product } from '@/features/products/types/product.types';

// 상품이 Neon으로 이전되어 브라우저에서 도는 MSW가 직접 읽을 수 없다.
// 이 경로에는 MSW 핸들러가 없으므로 bypass되어 실제 route로 나가고,
// 같은 오리진이라 세션 쿠키가 자동으로 붙어 인증도 통과한다.
//
// pageSize 1000은 "사실상 전체"를 뜻한다. 전용 전체조회 엔드포인트를 만들지 않는 이유는
// 그 유일한 소비자가 없어질 예정인 MSW 층이기 때문이다.
export const fetchProductsForMock = async (): Promise<Product[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // 기본 날짜 필터가 최근 7일이라 그대로 두면 오래된 상품이 스냅샷 원본에서 빠진다.
      dateType: 'register',
      startDate: '2000-01-01',
      endDate: '2999-12-31',
      saleType: 'ALL',
      categoryId: 'ALL',
      searchType: 'productName',
      searchValue: '',
      page: 1,
      pageSize: 1000,
    }),
  });

  if (!response.ok) return [];

  const { products } = (await response.json()) as { products: Product[] };
  return products;
};
```

- [x] **Step 8: 핸들러의 주입원을 어댑터로 교체**

`src/mocks/handlers/home.ts` — `MOCK_PRODUCT_DATA` import를 제거하고 교체한다.

```ts
import { fetchProductsForMock } from '../utils/fetchProducts';

http.post(`${baseUrl}/api/home/stats`, async ({ request }) => {
  const { ownerId } = (await request.json()) as { ownerId: string };
  const products = await fetchProductsForMock();
  return HttpResponse.json(getMockHomeStats(products, ownerId));
}),

http.post(`${baseUrl}/api/home/recent-products`, async ({ request }) => {
  const { ownerId } = (await request.json()) as { ownerId: string };
  const products = await fetchProductsForMock();
  return HttpResponse.json(getMockRecentProducts(products, ownerId));
}),
```

`src/mocks/handlers/mallLinkedProducts.ts` — 같은 방식으로 교체한다.

```ts
import { fetchProductsForMock } from '../utils/fetchProducts';

const products = await fetchProductsForMock();
if (!areMallLinkRequestsOwnedBy(items, ownerId, products)) {
  // 기존 403 응답 그대로
}
return HttpResponse.json(createMockMallLinkedProducts(items, ownerId, createdByEmail, products));
```

- [x] **Step 9: 클라이언트 api에서 `ownerId` 전송 제거**

서버가 세션에서 읽으므로 body·헤더로 보낼 이유가 없다. **함수 인자는 남긴다** — 호출부가 queryKey와 `enabled` 게이팅에 계속 쓴다.

`src/features/products/api/getProducts.ts`:

```ts
// ownerId 인자는 시그니처에 남기되 body에서 뺀다. 소유권 판정은 서버 세션이 한다.
export const getProducts = async (_ownerId: string, data: ProductSearch, page: number, pageSize: number = 10) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, page, pageSize }),
  });
  // 이하 그대로
```

`createProduct.ts` — `body: JSON.stringify(data)` 로 바꾼다.

`getProduct.ts` — `X-Owner-Id` 헤더를 제거한다.

```ts
export const getProduct = async (productId: string, _ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`);
  // 이하 그대로
```

`updateProduct.ts` — `X-Owner-Id`를 제거하고 **`Content-Type: application/json`을 추가한다** (기존에 빠져 있었다).

```ts
const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

`bulkCreateProducts.ts` — `body: JSON.stringify({ products: data })` 로 바꾼다.

- [x] **Step 10: `table.store.ts`에서 mock import 제거**

```ts
import { atom } from 'jotai';

export const itemsPageAtom = atom<number>(10);
export const currentPageAtom = atom<number>(1);

// 서버 응답의 totalPages로 갱신된다. mock 데이터를 참조하면 프로덕션 번들에 mock이 들어간다.
export const totalPagesAtom = atom<number>(1);
```

- [x] **Step 11: 타입 체크·테스트**

```bash
npx tsc --noEmit && npm run test
```

예상: 타입 에러 없음, 전체 테스트 통과. (`getProducts.test.ts`가 삭제되어 테스트 수가 줄어든다.)

- [x] **Step 12: 수동 검증**

`npm run dev` 후 순서대로 확인한다.

1. `/products/create`에서 이미지를 포함해 상품 등록 → 성공 alert
2. **Neon에서 `select product_id, main_image from products order by create_date desc limit 1;`** → `main_image`가 `images/usr_.../....png`
3. **Cloudflare 대시보드에 같은 key의 객체 존재**
4. `/products/list`에서 방금 등록한 상품이 보이고, **새로고침해도 남아 있는지**
5. 목록의 판매상태·카테고리·상품명 검색·기간 필터·페이징 동작
6. `/products/[id]` 진입 → 값이 채워지는지 → 이미지를 바꾸지 않고 저장 → 성공
7. 홈 대시보드의 상품 통계·최근 상품이 실제 등록 상품을 반영하는지
8. `/shopping/register`에서 전송 → 연동 생성되는지

- [x] **Step 13: 소유권 격리 확인**

다른 계정으로 로그인해 1번에서 만든 상품의 상세 URL(`/products/<그 productId>`)에 직접 접근한다.

예상: 404. (구현 전에는 `X-Owner-Id` 헤더만 바꾸면 조회됐다.)

---

## Task 7: 시드 스크립트

목록이 비어 있으면 배포 화면이 허전하고, 연동상품 mock 시드의 `sourceProductId`와도 맞지 않는다.

**Files:**
- Create: `scripts/seedProducts.ts`

**Interfaces:**
- Consumes: `products` 테이블 (Task 2), `MOCK_PRODUCT_DATA` (기존)
- Produces: 없음 (일회성 스크립트)

- [x] **Step 1: 시드 대상 `ownerId` 확인**

**사용자에게 묻는다.** `MOCK_PRODUCT_DATA`의 `ownerId`와 연동 mock 시드의 `OWNER_ID`(`usr_2f20748f`, `MockMallLinkedProductsData.ts`)가 같은 값이어야 연동상품 목록이 비지 않는다. 실제 로그인 계정의 `id`가 다르면 그 값을 받아 사용한다.

- [x] **Step 2: 스크립트 작성**

`scripts/seedProducts.ts`:

```ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../src/db';
import { products } from '../src/db/schema';
import { MOCK_PRODUCT_DATA } from '../src/mocks/data/MockProductsData';

// 사용법: npx tsx scripts/seedProducts.ts <ownerId>
// ownerId를 생략하면 mock 데이터에 적힌 값을 그대로 쓴다.
const ownerIdOverride = process.argv[2];

const main = async () => {
  const rows = MOCK_PRODUCT_DATA.map((p) => ({
    ...p,
    ownerId: ownerIdOverride ?? p.ownerId,
    mainImage: p.mainImage as string,
    createDate: new Date(p.createDate),
    updateDate: new Date(p.updateDate),
  }));

  await db.insert(products).values(rows).onConflictDoNothing();
  console.log(`시드 완료: ${rows.length}건`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

`onConflictDoNothing()`을 쓰는 이유: 스크립트를 두 번 돌려도 PK 충돌로 실패하지 않는다.

- [x] **Step 3: 실행**

```bash
npx tsx scripts/seedProducts.ts
```

예상: `시드 완료: N건`

- [x] **Step 4: 확인**

`npm run dev` 후 `/products/list`에 시드 상품이 보이는지, `/shopping/linked-products`의 연동 목록이 비어 있지 않은지 확인한다.

---

## Task 8: 문서·규칙 갱신

**Files:**
- Modify: `.claude/rules/msw-rules.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [x] **Step 1: `msw-rules.md`에 route 예외 추가**

"API 추가 규칙"의 예외 항목에 다음을 추가한다.

```markdown
- **예외 2 — 서버 전용 시크릿이 필요한 API는 `route.ts`를 사용한다.** R2 업로드(`/api/products/image`)와 상품 DB 접근(`/api/products/*`)이 여기 해당한다. R2 자격증명과 `DATABASE_URL`은 서버 전용이라 브라우저에서 도는 MSW로 처리할 수 없다. 회원가입 route가 DB 때문에 예외인 것과 같은 구조다. 해당 경로의 MSW 핸들러와 관련 utils/data는 함께 제거한다.
```

또한 `src/mocks/handlers/` 구조 설명에서 `products.ts` 줄을 제거한다.

- [x] **Step 2: `CLAUDE.md`에 시각 컬럼 규칙 추가**

"Key Conventions"에 다음 항목을 추가한다.

```markdown
- **시각 컬럼과 날짜 범위 필터:** 신규 테이블의 시각 컬럼은 `timestamp({ withTimezone: true })`를 쓴다. 날짜 범위 필터는 `src/shared/utils/date.ts`의 `toKstDateRange()`로 **KST 반개구간**(`>= start`, `< end + 1일`)을 만들어 비교한다. `lte(endDate)`로 비교하면 끝날짜 당일에 등록된 건이 통째로 누락되고, UTC 기준으로 자르면 KST 자정~오전 9시 등록 건이 하루 밀린다. `users` 테이블이 `text` `'YYYY-MM-DD'`인 것은 하위호환으로 유지하는 것이며 **선례로 삼지 않는다.**
```

- [x] **Step 3: `CLAUDE.md`의 테스트 범위 서술 수정**

현재 "test coverage is scoped to `src/mocks/utils/`"라고 적혀 있으나 실제와 다르다. `vitest.config.ts`에 `include`가 없어 전 경로의 `*.test.ts`가 실행되며, `src/features/`·`src/components/`에도 테스트가 있다.

```markdown
Vitest는 `vitest.config.ts`에 `include`를 두지 않아 전 경로의 `*.test.ts`를 실행한다. 테스트는 순수 로직(`src/mocks/utils/`, `src/shared/utils/`, `src/features/*/util/`, Excel 전략)에 붙이고, **UI 컴포넌트와 API fetch 래퍼는 관례상 테스트 파일을 만들지 않는다.**
```

- [x] **Step 4: 최종 전체 확인**

```bash
npm run lint && npx tsc --noEmit && npm run test && npm run build
```

예상: 전부 통과. `npm run build`는 `import 'server-only'`가 클라이언트 번들로 새는지도 함께 잡아준다.

---

## 완료 후

1. `superpowers:requesting-code-review`로 코드 리뷰 (Critical → 즉시 수정)
2. `/ce-compound`로 비자명한 결정·결함을 `docs/solutions/`에 문서화 제안
3. **사용자에게 커밋 승인을 요청**하고, 승인 시 Task 단위로 분리해 커밋
4. `superpowers:finishing-a-development-branch`로 브랜치 마무리
