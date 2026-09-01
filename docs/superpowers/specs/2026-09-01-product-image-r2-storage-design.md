# 상품 메인이미지 Cloudflare R2 저장 + 상품 데이터 Neon 이전 설계

- 작성일: 2026-09-01
- 선행 결정: R2 채택 (2026-08-31, AWS S3 재검토 종결)

## 1. 배경과 목적

상품 등록 화면에서 고른 메인이미지가 **서버에 도달하지 않는다.** 원인은 두 곳이다.

1. `createProduct.ts`가 `JSON.stringify({ ...data, ownerId })`로 보내는데 `data.mainImage`가 `File`이다. `JSON.stringify(File)`은 `{}`가 된다.
2. 설령 도달해도 `createMockProduct`(`src/mocks/utils/createProduct.ts:9`)가 `mainImage`를 faker URL로 **덮어쓴다.**

MSW가 성공 응답을 주기 때문에 지금까지 에러 없이 지나갔다.

이번 작업은 실제 파일을 Cloudflare R2에 저장하고 그 key를 상품 레코드에 영속화한다. 상품 레코드가 MSW의 브라우저 메모리에 남아 있으면 새로고침에 사라져 **R2에 고아 파일만 쌓이므로**, 상품 데이터의 Neon 이전을 같은 라운드에 포함한다.

R2를 택한 근거는 **배포 가능성**이다(사용자 결정). 취업용 포트폴리오라 배포된 URL에서 동작해야 의미가 있다.

## 2. 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 범위 | 이미지 R2 + 상품 Neon 이전 | 이미지만 옮기면 참조하는 레코드가 새로고침에 사라짐 |
| MSW 잔존 소비처 | 상품 배열을 **인자로 주입** | 범위 통제 + util 테스트가 오히려 단순해짐 |
| 업로드 경로 | **서버 경유** (FormData → route → R2) | 시크릿이 서버 밖으로 안 나가고, 실제 파일을 검증할 수 있음 |
| 업로드 시점 | **폼 제출 시** | 파일만 고르고 이탈해도 R2에 아무것도 안 남음 |
| 엔드포인트 | `POST /api/products/image` (범용 아님) | 프로필 이미지는 비로그인·`ownerId` 없음 등 요구가 근본적으로 다름 |
| DB 스키마 | 하이브리드 — 스칼라는 컬럼, 중첩 4개는 `jsonb` | 목록 검색 조건이 전부 스칼라 |
| `keyWords` | `jsonb` | 지금 검색에 안 쓰임. `text[]` 전환은 `USING` 절 한 줄 |
| 시각 컬럼 | `timestamptz` | 상품은 시각 표현 필요. UTC 저장 시 KST 새벽 등록 건이 하루 밀림 |
| 날짜 필터 | **KST 반개구간** `>= start`, `< end + 1일` | `lte(endDate)`는 끝날짜 당일 등록 건을 통째로 누락 |
| `mainImage` 저장 형태 | **R2 key** | 공개 도메인이 바뀌어도 환경변수 한 줄. URL이면 전 행 UPDATE |
| 고아 파일 | 이번 라운드는 **삭제하지 않음** | 연동 스냅샷이 key를 참조 중이고, 연동 데이터가 MSW에 있어 참조 카운트 불가 |

## 3. 범위

### 포함

1. `src/lib/storage.ts` — `buildImageKey` / `putImage` (서버 전용)
2. `products` 테이블 스키마 + 마이그레이션
3. `POST /api/products/image` — 인증·MIME·크기·매직넘버 검증 후 key 반환
4. `Product` 타입 정리 + `ProductFormValues` 신설 + 제출 시 업로드 합성
5. products API 5개 Neon 이전 + **소유권 판정을 세션 기반으로 전환**
6. MSW 상품 주입 어댑터 + `table.store.ts`의 mock import 제거
7. 시드 스크립트 `scripts/seedProducts.ts`
8. `toKstDateRange` 순수 함수 + 테스트
9. 규칙 문서 갱신 (`msw-rules.md` route 예외, `timestamptz`/KST 표준)

### 제외 (9장 오픈 이슈 참조)

- 이미지 **표시** 일체 (목록 썸네일, 수정화면 기존 이미지 미리보기)
- `toPublicUrl` / `src/lib/imageUrl.ts` — 이번 라운드에 소비처가 없다
- `NEXT_PUBLIC_R2_PUBLIC_URL` 환경변수, 버킷 공개 설정 (`*.r2.dev` vs 커스텀 도메인)
- 엑셀 외부 이미지 URL의 R2 재업로드
- 고아 파일 삭제
- 연동상품 일괄수정의 `mainImage` 제외 해제 (주석의 사유만 갱신)

## 4. 설계

### 4.1 스토리지 모듈

**이번 라운드에 만드는 파일은 `src/lib/storage.ts` 하나**다. 서버 전용이며 AWS SDK와 자격증명을 다룬다.

공개 URL 조립(`toPublicUrl`)은 여기 넣지 않는다. 클라이언트 컴포넌트가 그 함수를 import하는 순간 같은 모듈의 `S3Client`와 자격증명 접근 코드가 클라이언트 번들에 딸려 들어가기 때문이다. 표시 작업(오픈 이슈) 시점에 **별도 파일**(`src/lib/imageUrl.ts`)로 만든다.

```ts
// src/lib/storage.ts  -- 서버 전용
import 'server-only';

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const PRODUCT_IMAGE_PREFIX = 'images';

export const buildImageKey = (prefix: string, ownerId: string, originalName: string): string;
//  → `${prefix}/${ownerId}/${uuid}.${ext}`

export const putImage = (key: string, body: Buffer, contentType: string): Promise<void>;
```

`import 'server-only'`가 있으면 클라이언트에서 실수로 import했을 때 런타임이 아니라 **빌드가 실패**한다.

R2 특이사항:

- `region: 'auto'` — R2에는 리전 개념이 없다
- `PutObjectCommand`에 **`ACL`을 넣지 않는다** — R2는 객체 단위 ACL 미지원, 공개는 버킷 단위 설정
- (착수 시 확인) AWS SDK v3의 기본 체크섬 헤더를 R2가 거부하던 이슈. 재현되면 `requestChecksumCalculation: 'WHEN_REQUIRED'`를 붙인다

키 규칙 `images/<ownerId>/<uuid>.<ext>`:

- `images`는 R2에 이미 만들어 둔 접두사다. R2에 실제 폴더는 없고 키 접두사가 폴더처럼 보이는 것이다
- `<ownerId>` — 테넌트 구분이 키만 봐도 되고 계정 단위 용량 산정·정리가 가능하다
- 파일명은 uuid로 새로 만든다. 원본 파일명은 한글·공백·중복이 그대로 키가 된다. `uuid`는 이미 의존성에 있다
- 확장자 유지 — Content-Type 판정과 브라우저 표시에 쓰인다

### 4.2 `products` 테이블 스키마

검색·정렬·페이징에 쓰이는 값만 컬럼, 중첩 구조 4개는 `jsonb`.

```ts
export const products = pgTable('products', {
  productId: text('product_id').primaryKey(),
  ownerId: text('owner_id').notNull(),
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

  option: jsonb('option').$type<OptionCombination[]>(),
  subOption: jsonb('sub_option').$type<OptionCombination[]>(),
  keyWords: jsonb('key_words').$type<string[]>(),
  informationDisclosure: jsonb('information_disclosure').$type<ProductInformationDisclosure>().notNull(),
});
```

판정 기준은 "중첩이라서 JSONB"가 아니라 **"검색 조건에 안 들어가서 JSONB"**다. 옵션·키워드·정보고시는 `getProducts.ts`의 어떤 필터에도 등장하지 않고 상세 화면에서 통째로 읽어 통째로 쓴다.

Drizzle의 `.$type<...>()`을 쓰면 읽을 때 이미 도메인 타입으로 잡혀 기존 `Product`와 그대로 맞물린다.

#### `mainImage` 컬럼의 계약

컬럼에는 두 형태가 들어온다. 타입 주석에 근거를 남긴다.

```ts
/**
 * 메인이미지. 두 형태가 들어온다 — 표시할 때는 반드시 URL 조립 함수를 거친다.
 *  - R2 key   `images/<ownerId>/<uuid>.png`  화면에서 직접 업로드한 이미지
 *  - 절대 URL `https://...`                  엑셀 대량등록의 외부 이미지, 시드 데이터
 * 이번 라운드에는 표시 코드가 없어 분기가 존재하지 않는다.
 * 표시 작업(오픈 이슈)에서 두 형태를 흡수하는 함수를 만든다.
 */
```

주석 없이 두면 다음에 보는 사람이 "key로 통일이 안 된 실수"로 읽고 정규화를 시도한다. 이것은 **선택된 계약**이다.

### 4.3 업로드 route

```
POST /api/products/image
Content-Type: multipart/form-data
  file: <File>

200 { "key": "images/usr_a1b2c3d4/9f2e....png" }
400 { "error": "..." }      검증 실패
401 { "error": "로그인이 필요합니다." }
500 { "error": "..." }
```

처리 순서:

1. `requireSession(req)` — `src/shared/utils/apiAuth.ts`. 비로그인 상태로 R2에 쓰는 것을 막는다
2. `formData.get('file')`이 `File`인지 확인
3. MIME 화이트리스트 — 기존 `acceptImage`(`image/png, image/jpeg, image/jpg`)와 맞춘다
4. 크기 상한 **4MB** — Vercel 본문 제한(4.5MB) 아래로 여유를 둔다
5. 매직 넘버 검사 — PNG `89 50 4E 47`, JPEG `FF D8 FF`. `file.type`은 브라우저가 보낸 값이라 위조된다
6. `buildImageKey(PRODUCT_IMAGE_PREFIX, session.ownerId, file.name)` → `putImage(...)` → `{ key }` 반환

**응답이 URL이 아니라 key**인 것이 4.2의 저장 형태와 맞물린다.

#### Vercel 4.5MB 제한의 실제 동작

초과 요청은 route에 **도달하기 전에** 플랫폼이 413으로 끊는다. 위 4번 검증이 실행될 기회조차 없고 클라이언트는 정체불명의 실패를 본다. 따라서 **파일 선택 시점에 클라이언트가 크기를 먼저 검사**해 안내 메시지를 띄우고, 서버 검증은 방어선으로 유지한다. 상한값은 공용 상수 하나로 둔다.

#### 엔드포인트를 범용(`/api/images`)으로 두지 않는 이유

프로필 이미지 업로드와 요구가 근본적으로 다르다.

| | 상품 메인이미지 | 프로필 이미지 |
|---|---|---|
| 키 접두사 | `images/` | `profile/` |
| 크기·형식 정책 | 4MB, 상품 사진 | 아바타 |
| **인증** | 로그인 필수 | **회원가입 중이면 비로그인** |
| **`ownerId`** | 세션에서 확보 | **계정 생성 전이라 없음** |

하나의 route로 묶으면 `requireSession`을 조건부로 만들게 되고, 그것은 **인증 없이 R2에 쓸 수 있는 경로를 여는 것**이다. 재사용은 route가 아니라 `src/lib/storage.ts`에서 일어난다. 프로필 업로드가 생기면 껍데기(인증 방식·검증 정책·접두사)만 새로 쓰면 되고, 그 껍데기가 정확히 두 용도가 다른 부분이다.

#### `msw-rules.md` 예외

이 route는 "MSW 핸들러를 쓰라"는 금지 규칙의 예외다. R2 시크릿은 서버 전용이라 브라우저에서 도는 MSW로 처리할 수 없다. 회원가입 route가 DB 때문에 예외인 것과 같은 구조다. **규칙 문서에 이 예외를 명시한다.**

### 4.4 타입 정리와 제출 흐름

도메인 타입에서 `File`을 걷어낸다.

```ts
// product.types.ts
export interface Product {
  mainImage: string;   // R2 key 또는 절대 URL.  (기존: string | File)
}

export type ProductFormValues = Omit<Product, 'mainImage'> & {
  mainImage: File | string;   // File = 새로 고른 이미지 / string = 기존 값 유지
};
```

폼에서는 유니온이 **정당하다.** 등록 화면은 `File`을 들고, 수정 화면은 `reset(queryData)`로 채워진 기존 key(`string`)를 들다가 사용자가 파일을 고르면 `File`이 된다. 핵심은 유니온을 없애는 것이 아니라 **유니온이 있어야 할 자리로 옮기는 것**이다. 지금은 DB·API·연동 스냅샷까지 `File`이 따라다녀 모든 소비처가 각자 판단해야 한다.

제출 시 합성:

```ts
// mutationFn 안
const key = await resolveMainImageKey(values.mainImage);
return createProduct({ ...values, mainImage: key });
```

```ts
// src/shared/api/uploadImage.ts
export const resolveMainImageKey = async (value: File | string): Promise<string> =>
  typeof value === 'string' ? value : uploadProductImage(value);
```

엔드포인트를 부르는 얇은 함수(`uploadProductImage`)는 `/api/products/image`가 상품 도메인 경로이므로 `features/products/api/`에 둔다(`domain-design.md`의 "API 함수는 엔드포인트가 속한 도메인에 둔다"). `resolveMainImageKey`는 업로드 일반을 다루는 합성 함수라 `src/shared/api/`에 둔다.

파급 지점:

| 파일 | 변경 |
|---|---|
| `ProductCreateLayout.tsx` | `useForm<ProductFormValues>()`, mutationFn에 업로드 합성 |
| `ProductModifyLayout.tsx` | 동일. `reset(queryData)`는 문자열이 들어와 그대로 동작 |
| `ProductMainImageInfo.tsx` | `useFormContext<ProductFormValues>()`, 크기 선검사 추가 |
| `productBulkEdit.constants.ts:12` | 제외 사유 주석 갱신 (타입 이유가 사라짐) |

`mocks/utils/createProduct.ts`의 faker 덮어쓰기는 별도로 고치지 않는다. 그 파일이 MSW 핸들러와 함께 삭제되기 때문이다(4.5 참조).

연동상품 일괄수정의 `mainImage` 제외는 **유지한다.** 타입 이유는 없어지지만 "N개 상품에 같은 이미지를 넣는다"가 원하는 동작인지 불명확하다. 주석의 사유만 갱신해 다음에 읽는 사람이 사라진 근거를 붙들지 않게 한다.

### 4.5 products API의 Neon 이전

route 파일 4개, 엔드포인트 5개.

```
src/app/api/products/list/route.ts          POST   목록
src/app/api/products/create/route.ts        POST   생성
src/app/api/products/[productId]/route.ts   GET·PATCH
src/app/api/products/bulk/route.ts          POST   엑셀 대량 등록
```

#### 소유권 판정을 세션 기반으로 (필수 동반 작업)

현재 소유권은 **클라이언트가 보낸 값**으로 판정한다.

```ts
const { ownerId, ... } = await request.json();          // list·create·bulk
const ownerId = request.headers.get('X-Owner-Id');      // GET·PATCH
```

MSW라 무해했지만 실제 서버로 옮기는 순간 **헤더 한 줄로 남의 상품을 조회·수정할 수 있는 구멍**이 된다. route는 body/헤더의 `ownerId`를 무시하고 `requireSession(req).ownerId`만 신뢰한다. `users/list/route.ts`가 이미 쓰는 방식이다.

클라이언트의 `workspaceOwnerId`는 **queryKey와 `enabled` 게이팅 용도로 남기고** 요청 body에서만 뺀다. 계정 전환 시 캐시가 갈리는 것은 여전히 필요하다.

#### 목록 쿼리

```ts
const conditions = [eq(products.ownerId, session.ownerId)];

const { start, endExclusive } = toKstDateRange(startDate, endDate);
const dateCol = dateType === 'update' ? products.updateDate : products.createDate;
conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

if (saleType !== 'ALL')   conditions.push(eq(products.state, saleType));
if (categoryId !== 'ALL') conditions.push(eq(products.categoryId, categoryId));
if (searchValue) {
  const col = searchType === 'productName' ? products.name : products.productId;
  conditions.push(ilike(col, `%${searchValue}%`));
}
```

**동작 변화 1건:** mock의 `includes`는 대소문자를 구분했으나 `ilike`는 무시한다. `users` 목록이 이미 `ilike`라 그쪽에 맞추는 것이 일관되고, 상품명 검색에서도 이쪽이 자연스럽다.

#### 생성·수정·대량

- `generatorProductCode()` 유지
- `mainImage`는 클라이언트가 보낸 key를 **그대로 저장한다.** mock의 faker 덮어쓰기는 이식하지 않는다
- PATCH는 `ownerId`를 갱신 대상에서 제외(기존 util과 동일), `updateDate` 갱신
- bulk는 `db.insert().values([...])` **한 문장**이라 원자적이다

#### 삭제되는 파일

| 파일 | 사유 |
|---|---|
| `src/mocks/handlers/products.ts` | 5개 엔드포인트가 route로 이전 |
| `src/mocks/utils/getProducts.ts` + `.test.ts` | 필터 로직이 SQL로 이전 (4.8에서 날짜 경계만 순수 함수로 보존) |
| `src/mocks/utils/createProduct.ts` | 생성이 route로 이전 |
| `src/mocks/utils/updateProduct.ts` | 수정이 route로 이전 |

`src/mocks/handlers.ts` 인덱스에서 `productHandlers` spread도 함께 제거한다. `src/mocks/data/MockProductsData.ts`는 **삭제하지 않는다** — 역할이 바뀔 뿐이다(4.6 참조).

`drizzle-orm/neon-http`는 `db.transaction()`을 호출하면 `No transactions support in neon-http driver`를 던진다(`neon-http/session.js:152`). 이번 설계의 쓰기 경로는 모두 단일 문장이라 이 제약에 걸리지 않는다.

### 4.6 MSW 상품 주입 어댑터

`MOCK_PRODUCT_DATA` 소비처는 성격이 둘로 갈리며, 전부 주입으로 바꿀 필요가 없다.

#### (1) 모듈 로드 시점 정적 시드 — 그대로 둔다

`MockMallLinkedProductsData.buildSeed`는 상품을 찾아 `structuredClone(product)`로 스냅샷을 복사한다. 복사가 끝나면 원본 테이블이 필요 없다. 게다가 모듈 로드 시점에 동기로 실행되므로 `fetch`로 바꿀 수도 없다.

`MockProductsData.ts`는 **"상품 목록의 데이터 소스"에서 "연동 시드용 픽스처"로 역할만 바뀐다.** 파일 상단 주석에 그 역할을 명시한다. 적지 않으면 다음에 보는 사람이 "왜 상품이 두 군데 있지"로 읽는다.

#### (2) 런타임 조회 — 주입으로 전환

| 함수 | 변경 |
|---|---|
| `getMockHomeStats(ownerId)` | `(products, ownerId)` |
| `getMockRecentProducts(ownerId)` | `(products, ownerId)` |
| `areProductsOwnedBy(ids, ownerId)` | `(ids, ownerId, products)` |
| `areMallLinkRequestsOwnedBy(items, ownerId)` | `(items, ownerId, products)` — 위 함수를 호출하므로 함께 따라간다 |
| `createMockMallLinkedProducts(items, ownerId, email)` | `(..., products)` |

핸들러가 실 API에서 가져와 넘긴다.

```ts
// src/mocks/utils/fetchProducts.ts
export const fetchProductsForMock = async (): Promise<Product[]>
//  → POST /api/products/list 를 기본 필터 + pageSize 1000 으로 호출.
//     MSW에 이 경로 핸들러가 없어져 bypass되고 실제 route로 나간다.
//     같은 오리진이라 세션 쿠키가 자동으로 붙어 인증도 통과한다.
```

`pageSize: 1000`은 "사실상 전체"를 뜻하는 값이다. 전용 전체조회 엔드포인트를 새로 만들지 않는 이유는, 그 엔드포인트의 유일한 소비자가 **없어질 예정인 MSW 층**이기 때문이다. 연동상품이 Neon으로 이전되면 이 어댑터 자체가 사라진다.

날짜 필터는 기본값이 최근 7일이므로, 이 호출에서는 **전체 기간**을 넘겨야 오래된 상품도 스냅샷 원본으로 찾을 수 있다.

테스트가 오히려 단순해진다. 현재 4개 테스트 파일이 `vi.mock('../data/MockProductsData', ...)`로 모듈을 가로채는데, 인자로 받게 되면 그 장치가 사라진다.

주의점:

- `verifyOwnership`을 쓰는 연동 핸들러들이 async가 된다. MSW 핸들러는 async를 지원하므로 문제 없고 호출부 시그니처만 따라간다
- 매 요청마다 상품 목록을 다시 가져오는 비용이 있다. 홈은 진입당 1회, 연동 전송은 사용자 액션 시점이라 빈도가 낮으므로 **캐시 없이 시작**하고 체감되면 요청 단위 메모이즈를 붙인다

#### (3) 클라이언트가 mock을 직접 import하는 결함

```ts
// features/products/store/table.store.ts:1,8
import { MOCK_PRODUCT_DATA } from '@/mocks/data/MockProductsData';
const mockTotalPages = Math.ceil(MOCK_PRODUCT_DATA.length / 10);
```

**프로덕션 번들에 mock 데이터가 통째로 들어가고 있다.** 초기값을 `1`로 두고 서버 응답의 `totalPages`로 갱신해 이 import를 끊는다.

### 4.7 시드 스크립트

`scripts/seedProducts.ts` (tsx는 이미 devDependency). `MOCK_PRODUCT_DATA`를 Neon에 넣는다.

- 목록이 비면 배포 화면이 허전하다
- 연동상품 시드의 `sourceProductId`와 맞아떨어져야 원본 추적 링크가 살아난다
- **시드 대상 `ownerId`는 착수 시 사용자에게 확인한다.** 연동 mock 시드의 `OWNER_ID`(`usr_2f20748f`)와 어긋나면 연동상품 목록이 비어 보인다

### 4.8 날짜 유틸과 테스트

```ts
// src/shared/utils/date.ts
export const toKstDateRange = (startDate: string, endDate: string): { start: Date; endExclusive: Date };
```

`getProducts.test.ts`가 사라지면 커버리지가 준다. **가장 틀리기 쉬운 부분만 순수 함수로 떼어 테스트 아래 남긴다.** 반개구간 경계와 KST 변환은 틀려도 증상이 조용하다(하루 어긋남). 여기가 고정되면 나머지는 평범한 `WHERE`다.

**vitest 설정 변경은 필요 없다.** `vitest.config.ts`에 `include`가 없어 기본값이 적용되고, 이미 `src/features/`·`src/components/` 아래의 테스트가 함께 실행되고 있다. (`CLAUDE.md`의 "테스트 범위가 `src/mocks/utils/`로 한정" 서술은 설정이 아니라 관례를 적은 것이고 현재 실제와 어긋나므로, 4.9에서 함께 갱신한다.)

테스트 케이스:

- 끝날짜 당일 오후에 등록된 건이 포함되는가 (반개구간)
- KST 08:00 등록 건이 그날 날짜로 잡히는가 (UTC 기준이면 전날이 됨)
- 시작일과 끝날짜가 같은 하루짜리 범위

### 4.9 규칙 문서 갱신

- `msw-rules.md` — R2 업로드 route를 `route.ts` 금지 규칙의 예외로 명시
- 신규 — 시각 컬럼은 `timestamptz`, 날짜 범위 필터는 KST 반개구간. `users`가 `text` `'YYYY-MM-DD'`인 것은 유지하되 **선례로 삼지 않는다**는 점을 함께 적는다
- `CLAUDE.md` — "테스트 범위가 `src/mocks/utils/`로 한정"이라는 서술을 현재 실제(`src/features/`·`src/components/`에도 테스트가 있고 vitest가 전 경로를 실행)에 맞게 고친다

`users`를 마이그레이션하지 않는 이유: `'YYYY-MM-DD'`로 저장돼 시각 정보가 애초에 없어, 옮겨도 전부 `00:00`으로 채워질 뿐 복원되는 것이 없다.

## 5. 데이터 흐름

```
[상품 등록]
사용자가 파일 선택
  → 클라이언트: 크기 선검사(4MB), FileReader로 dataURL 미리보기
  → 폼 값 mainImage = File

"상품 등록" 클릭
  → resolveMainImageKey(File)
       → POST /api/products/image  (multipart)
            requireSession → MIME → 크기 → 매직넘버
            → buildImageKey → putImage → { key }
  → POST /api/products/create  { ...values, mainImage: key }
       requireSession → ownerId 주입 → INSERT
```

```
[MSW 잔존 도메인]
연동 전송 핸들러 (브라우저)
  → fetchProductsForMock()  → POST /api/products/list (bypass → 실 route)
  → createMockMallLinkedProducts(items, ownerId, email, products)
```

## 6. 에러 처리

| 상황 | 처리 |
|---|---|
| 4MB 초과 | 클라이언트가 선검사해 안내. 서버는 방어선(플랫폼이 413으로 먼저 끊을 수 있음) |
| MIME·매직넘버 불일치 | 400 + 안내 메시지 |
| 비로그인 | 401 |
| 업로드 성공 후 상품 저장 실패 | 기존 `onError` alert. **업로드된 파일은 남는다**(고아). 이번 라운드 방침 |
| 남의 상품 조회·수정 시도 | 404 (존재 여부 노출 방지) |

## 7. 검증 방법

이번 라운드에는 이미지를 보여주는 화면이 없다. 검증은 다음 둘로 한다.

1. 상품 등록 후 **Cloudflare 대시보드의 `images/` 아래에 객체가 생겼는지**
2. **Neon `products.main_image`에 그 key가 저장됐는지**

추가로 목록·검색·페이징이 Neon 기준으로 동작하는지, 새로고침 후에도 상품이 남는지 확인한다.

## 8. 이번 작업으로 해소되는 선행 결함

1. `JSON.stringify(File)` → `{}` — 제출 시점에 이미 key 문자열이라 사라진다 (별도 수정이 아니라 타입 정리의 결과)
2. `createMockProduct`의 `mainImage` faker 덮어쓰기 — 해당 코드가 제거된다
3. 클라이언트가 보낸 `ownerId`로 소유권을 판정하던 문제 — 세션 기반으로 전환
4. `table.store.ts`가 프로덕션 번들에 mock 데이터를 끌어들이던 문제

## 9. 다음 라운드로 넘기는 오픈 이슈

| 항목 | 출처 |
|---|---|
| 상품 이미지 표시 — 수정화면 기존 이미지 미리보기 + 목록 썸네일 | **사용자 요구** — "오리진상품, 연동상품 화면작업을 진행하는데 빼먹은 기능 중 하나이므로 지금 작업 이후에 따로 진행할 예정", "섹션 7은 미리보기 작업시 같이 진행" |
| 엑셀 외부 이미지 URL 처리 (그대로 사용 vs R2 재업로드) | **사용자 요구** — "별도의 작업세션으로 따로 진행" |
| 고아 파일 삭제 방침 | **사용자 요구** — "사용하지 않는 고아 파일을 그대로 둘순 없으니 추후에 삭제 처리관련해서 방침을 정해 적용 작업을 진행하자" |
| 연동상품·홈의 Neon 이전. 되면 고아 파일 참조 카운트가 가능해진다 | Claude 제안 — 사용자 미확인 |
| `next/image` 전환 (컬럼이 항상 key가 된 뒤) | Claude 제안 — 사용자 미확인 |
| `keyWords` `jsonb` → `text[]` (키워드 검색이 생기면) | Claude 제안 — 사용자 미확인 |
| **공개 URL이 붙는 라운드에 `isMainImageOwnedBy`의 절대 URL 우회로를 닫을 것.** 현재 `^https?://`면 무조건 통과하므로, 우리 버킷 공개 도메인을 가리키는 URL(`https://<r2-public>/images/usr_남/…`)로 남의 객체를 지정할 수 있다. 표시 코드가 없는 지금은 무해하다. `NEXT_PUBLIC_R2_PUBLIC_URL` 도입 시 그 접두사로 시작하는 URL은 key로 정규화해 같은 소유권 검사를 태운다 — `storage.test.ts`의 `[알려진 우회로]` 테스트 기대값을 그때 `false`로 뒤집는다 | 코드 리뷰(2026-09-01) 지적 — 사용자 미확인 |
| DB `null` ↔ 도메인 타입 `undefined` 경계를 route 응답 직전 매핑 함수 한 곳으로 정규화 (nullable 컬럼 11개. `netPrice`만 `== null` 가드로 개별 대응한 상태) | 코드 리뷰(2026-09-01) 지적 — 사용자 미확인 |
| `products` 테이블에 `(owner_id, create_date desc)` 인덱스 (데이터가 늘면 목록·`fetchProductsForMock`이 먼저 체감된다) | 코드 리뷰(2026-09-01) 지적 — 사용자 미확인 |
| 시드 픽스처가 faker 런타임 값이라 `/products/list`(Neon에 굳은 값)와 `/shopping/linked-products`(로드마다 새 faker 값) 상품명이 다르게 보인다. 고정값 픽스처로 교체 검토 | 코드 리뷰(2026-09-01) 지적 — 사용자 미확인 |
| **`next/image` 도입 시 `images.remotePatterns`를 호스트 화이트리스트로 둘 것** (아래 9.1) | 보안 점검(2026-09-01) — **사용자 질문**에서 출발 |
| **bulk route에 행 단위 스키마 검증(Zod)을 넣고 위반 시 "N번째 행" 400으로 돌려줄 것** (아래 9.1) | 보안 점검(2026-09-01) — **사용자 질문**에서 출발 |

### 9.1 엑셀 대량등록 값에 대한 보안 점검 (2026-09-01)

**사용자 질문:** *"엑셀로 대량 상품등록을 진행하는데 메인이미지에 이미지 url을 넣어서 등록하는데 문제되는 url을 넣어서 등록하게 되었을때 db 보안상 문제가 없을까?"* → 이어서 *"어떤 필드든 url로 입력을 할 수 있으니 다른곳에는 문제가 없을까?"*

dev 서버의 실제 route에 악성 값을 넣어 확인했다(테스트 행은 삭제 완료). **아래는 추정이 아니라 실측 결과다.**

**뚫린 곳 없음 — 저장 시점의 보안은 성립한다.**

| 시도 | 결과 |
|---|---|
| `javascript:` · `data:text/html` · `../` · 남의 R2 key · `'; DROP TABLE products;--` | **전부 400** — `isMainImageOwnedBy`가 `^https?://`(소문자)이거나 본인 key 네임스페이스만 통과시킨다 |
| `ownerId`·`productId`·`createDate` 위조 | **무시됨** — `{ ...p, productId, ownerId, createDate, updateDate }`에서 신뢰 필드를 **뒤에** 덮어쓴다 |
| 스키마에 없는 키(`hackedColumn`)·`__proto__` 주입 | **무시됨** — 컬럼 생성 없음 |
| `<script>` 포함 문자열 저장 | 저장되지만 React가 이스케이프. `dangerouslySetInnerHTML`은 차트 한 곳뿐이고 상품과 무관 |
| SQL 인젝션 | Drizzle 파라미터 바인딩. `DROP TABLE` 문자열 투입 후에도 테이블 정상 |

**위험은 저장이 아니라 "그 값을 나중에 어떻게 쓰느냐"에 있다** — 서버가 URL을 fetch하거나(`next/image` 최적화가 그렇다), HTML로 렌더하거나, 엑셀로 내보낼 때. 상품 데이터 엑셀 내보내기 기능은 현재 없어 수식 인젝션은 해당 없음.

**무결성 구멍 6건(보안 아님, 실측):**

1. 숫자 필드에 글자 → `Number('abc')` = `NaN` → **배치 전체가 500**, 몇 번째 행인지 알 수 없음. 소수점 판매가·21억 초과도 같은 500
2. 음수 가격(`-50000`) 저장됨
3. `판매상태`에 임의 문자열 저장됨(`text` 컬럼, enum 제약 없음) → **목록 필터·홈 통계에서 조용히 누락되는 유령 상품**
4. `키워드`가 배열이 아니어도 jsonb에 그대로 들어감 → 나중에 `.map()` 쓰는 코드가 생기면 런타임 오류
5. 길이·개수 상한 없음(10만 자 상품명, 옵션 1만 개 통과). 실질 제동은 Vercel 본문 4.5MB뿐
6. `informationDisclosure: null`이면 notNull 위반으로 500

엑셀 업로드 검증(`validateExcelData`)은 **필수 누락·빈 값만** 보고 자료형은 보지 않는다. 위 6건은 **bulk route의 행 단위 Zod 검증 한 곳**으로 함께 닫히며, 이미지와 같은 "N번째 행" 400 형식을 쓰면 메시지 형태도 일관된다.

## 10. 기각한 대안과 근거

### 완전 정규화 (`product_options` 테이블 분리)

`OptionCombination.values`가 동적 키(`{ [key: string]: string }`)라 완전 정규화는 테이블 **3개**(`products` / `product_options` / `product_option_values`)가 된다. 옵션 하나를 읽으려면 3-way 조인 후 재조립이 필요하다.

사주는 것 네 가지가 모두 현재 요구가 아니다. 옵션 단위 재고 집계는 `totalQuantity` 컬럼이 이미 있고, SKU 유니크 제약은 `domain-design.md`가 **하지 않기로 명시**했으며, 옵션 값 필터링 화면은 없고, 옵션 부분 수정도 폼이 통째 교체한다.

물리는 비용은 셋이다. (1) 쓰기가 delete-all + insert-all이 되는데 `db.transaction()`을 못 써 `db.batch()`로 statement 배열을 동적 조립해야 하고, 중간 결과(삽입된 id)를 다음 쿼리에 넘길 수 없어 PK를 앱에서 미리 만들어야 한다. (2) `MallLinkedProduct.productSnapshot`이 옵션을 JSON으로 들고 있어 **같은 구조가 두 표현으로 공존**하게 된다. (3) 읽기마다 재조립 코드가 붙는다.

전환 조건: 주문이 옵션 행을 FK로 참조해야 할 때, 옵션별 실시간 재고 차감 화면이 생길 때. 그때 `jsonb`를 펼치는 백필 한 번이면 되고, 데이터가 이미 고정 4필드로 구조화돼 손실 없이 풀린다.

### 전체를 JSONB 한 컬럼

목록의 필터 6개가 전부 JSONB 연산이 되고 날짜 비교에 캐스팅이 붙는다.

### presigned PUT

Vercel 4.5MB 제한을 피하고 서버 대역폭을 안 쓰지만, 서명 발급 시점에 실제 파일을 볼 수 없어 검증이 약해진다. 버킷 CORS 설정(배포 도메인 + localhost)도 필요해진다. 상품 이미지가 4.5MB를 넘는 경우가 드물어 이득보다 비용이 크다.

### 파일 선택 즉시 업로드

등록을 취소하거나 이미지를 여러 번 바꾸면 그때마다 고아 파일이 남는다. 미리보기는 이미 `FileReader`의 dataURL로 동작하므로 즉시 업로드가 주는 이득이 없다.

### 이미지 교체 시 이전 key 삭제

`MallLinkedProduct.productSnapshot`이 `mainImage` key를 복사해 보관한다. 지우면 연동상품이 가리키는 파일이 사라져 **스냅샷의 존재 이유가 무효화**된다. "아무도 참조하지 않을 때만 삭제"는 연동 데이터가 브라우저 MSW에 있어 서버가 셀 수 없으므로 이번 라운드에 **물리적으로 불가능**하다.

용량으로도 급하지 않다. 700×700 상품 이미지 약 200KB, R2 무료 구간 10GB이므로 약 5만 장이다.

### 범용 업로드 엔드포인트 `/api/images`

4.3의 표 참조. 프로필 이미지는 비로그인·`ownerId` 없음이라 인증을 조건부로 만들게 되고, 그것은 인증 없이 R2에 쓸 수 있는 경로를 여는 것이다.
