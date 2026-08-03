# 쇼핑몰 연동 데이터 수정·재전송 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/shopping/linked-products`의 연동 데이터를 단건 수정하고, 단건·일괄로 외부 쇼핑몰에 다시 전송하는 기능을 만든다.

**Architecture:** 저장(스냅샷 수정)과 재전송(외부몰 전송)을 **별개 액션**으로 구현한다. 저장은 `updatedAt`만, 재전송은 `lastSentAt`·`status`만 건드린다. 수정 화면은 `useForm<Product>`와 `useForm<ShoppingSettingFormValues>` **두 폼**을 나란히 두고 기존 섹션 컴포넌트를 직접 나열해, 기존 상품·설정 폼 래퍼를 전혀 수정하지 않는다. 개발 환경에서는 MSW가 백엔드 역할을 대신하고, 외부몰 통신 시뮬레이션은 `mallLinkSimulation.ts` 한 파일에 격리한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form, TanStack Query, Jotai, MSW, Vitest, Tailwind CSS 4

**설계 문서:** `docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md`

## Global Constraints

- **git 명령을 자동 실행하지 않는다.** 각 Task 끝의 커밋 단계는 계획 문서상의 안내일 뿐이다. 사용자가 그 시점에 명시적으로 요청한 경우에만 실제 `git add`/`git commit`을 실행한다 (CLAUDE.md Git/PR 규칙).
- **`src/app/api/.../route.ts`를 만들지 않는다.** 모든 API는 `src/mocks/handlers/`에 MSW 핸들러로 추가한다 (`.claude/rules/msw-rules.md`).
- **핸들러는 로직을 갖지 않는다.** 조건문·반복문·데이터 조작은 전부 `src/mocks/utils/`로 위임하고, 핸들러가 mock 데이터 배열을 직접 import하지 않는다.
- **고정 경로를 동적 경로보다 먼저 등록한다.** `/list`, `/resend`가 `/:id`보다 앞에 와야 한다.
- **테스트는 `src/mocks/utils/`에만 작성한다.** UI 컴포넌트·API fetch 래퍼·훅·store는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md).
- **폰트 크기와 폰트 색상을 임의로 바꾸지 않는다** (CLAUDE.md 스타일 수정 규칙). 기존 컴포넌트의 클래스를 건드리지 않는다.
- **테이블 헤더 상수와 바디 셀은 항상 같은 변경에서 짝으로 추가한다.** 개수가 어긋나면 컬럼이 밀린다 (`docs/solutions/architecture-patterns/screen-owned-table-header-constants.md`).
- 시각 필드는 ISO 문자열(`new Date().toISOString()`)로 저장한다.

---

## Task 1: 타입 추가 + 외부몰 시뮬레이션 모듈 분리

재전송이 생성과 같은 실패율·오류 메시지·코드 발급 규칙을 써야 하므로, 지금 `createMallLinkedProducts.ts` 안에 있는 시뮬레이션 코드를 공용 모듈로 뺀다. **동작은 하나도 바뀌지 않는다** — 기존 테스트가 그대로 통과하는 것이 이 Task의 합격 기준이다.

**Files:**
- Create: `src/mocks/utils/mallLinkSimulation.ts`
- Modify: `src/mocks/utils/createMallLinkedProducts.ts`
- Modify: `src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts`
- Test: `src/mocks/utils/createMallLinkedProducts.test.ts` (기존 파일, **수정하지 않고** 통과해야 함)

**Interfaces:**
- Produces:
  - `isSendSuccess(): boolean`
  - `nextSequence(): number`
  - `createLinkedProductId(sequence: number): string`
  - `createExternalProductId(mallCode: ShoppingMalls, sequence: number): string`
  - `resolveErrorMessage(productId: string, mallCode: ShoppingMalls, ownerId: string): string`
  - `resolveResendErrorMessage(mallCode: ShoppingMalls): string`
  - `UpdateMallLinkedProductBody`, `ResendMallLinkedProductsBody`, `ResendMallLinkedProductsResult`

- [ ] **Step 1: 기존 테스트가 통과하는 기준선을 확인한다**

Run: `npx vitest run src/mocks/utils/createMallLinkedProducts.test.ts`
Expected: PASS (9 tests). 이 Task가 끝난 뒤 같은 명령이 같은 결과를 내야 한다.

- [ ] **Step 2: 요청·응답 타입을 추가한다**

`src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts` 파일 **맨 끝에** 아래를 덧붙인다. 기존 내용은 건드리지 않는다 (`MallLinkedProduct` 자체는 이번 라운드에 변경 없음).

```typescript
/**
 * 저장(스냅샷 수정) 요청 본문.
 * ownerId는 본문이 아니라 X-Owner-Id 헤더로 전달한다 — 단건 리소스를 다루는 기존 API와 같은 방식이다.
 */
export interface UpdateMallLinkedProductBody {
  updatedByEmail: string;
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;
}

/** 재전송 요청 본문 — 단건도 원소가 하나인 배열로 보낸다. */
export interface ResendMallLinkedProductsBody {
  ownerId: string;
  ids: string[];
}

/**
 * 재전송 집계 결과.
 * CreateMallLinkedProductsResult와 구조가 같지만 의미가 다르고 한쪽만 바뀔 수 있어 따로 둔다.
 */
export interface ResendMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

`Product`와 `ShoppingSetting`은 이 파일 상단에서 이미 import하고 있으므로 import 추가는 필요 없다.

- [ ] **Step 3: 시뮬레이션 공용 모듈을 만든다**

`src/mocks/utils/mallLinkSimulation.ts`를 새로 만든다. 내용은 `createMallLinkedProducts.ts`에서 옮겨오되, 재전송용 함수 하나(`resolveResendErrorMessage`)를 추가한다.

```typescript
import { ShoppingMalls } from '@/types/common.type';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';

// --- 외부 몰 API 시뮬레이션 전용 모듈 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일은 통째로 삭제된다. constant/로 분리하지 않는 이유다.
const FAILURE_RATE = 0.1;
const DUPLICATE_ERROR_MESSAGE = '동일 상품이 이미 등록되어 있습니다';
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  NSST: '카테고리 매핑 오류',
  KAKAOS: '상품명 글자 수 초과',
};

// Date.now()는 밀리초 단위라 같은 조합을 짧은 시간(또는 같은 밀리초)에 연속 전송하면 값이 겹칠 수 있고,
// 테스트에서 Math.random()을 상수로 고정하면 externalProductId도 겹칠 수 있다.
// 두 값 모두 이 모듈 스코프 카운터를 섞어 프로세스 내에서 유일함을 보장한다.
let idSequence = 0;
export const nextSequence = () => idSequence++;

export const createLinkedProductId = (sequence: number) => `mlp_${Date.now()}_${sequence}`;

export const createExternalProductId = (mallCode: ShoppingMalls, sequence: number) =>
  `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}${sequence}`;

export const isSendSuccess = () => Math.random() >= FAILURE_RATE;

/**
 * 신규 등록 전송의 실패 사유를 고른다.
 * 외부몰은 같은 상품이 이미 올라가 있으면 중복이라고 실패 응답을 준다.
 * 이 시뮬레이션도 같은 테넌트(ownerId) 안에서 같은 상품 × 같은 몰에 성공 이력이 있으면 중복 사유를 쓴다.
 * ownerId 조건이 없으면 다른 테넌트의 성공 이력 때문에 내 전송이 중복으로 오판될 수 있다.
 */
export const resolveErrorMessage = (productId: string, mallCode: ShoppingMalls, ownerId: string) => {
  const hasSuccess = MOCK_MALL_LINKED_PRODUCT_DATA.some(
    (linked) =>
      linked.ownerId === ownerId &&
      linked.sourceProductId === productId &&
      linked.mallCode === mallCode &&
      linked.status === 'success',
  );

  if (hasSuccess) return DUPLICATE_ERROR_MESSAGE;
  return MALL_ERROR_MESSAGES[mallCode] ?? FALLBACK_ERROR_MESSAGE;
};

/**
 * 재전송(이미 externalProductId가 있는 건)의 실패 사유.
 * 외부몰에 상품이 이미 있는 상태의 전송은 신규 등록이 아니라 '수정'이라
 * 중복이라는 개념이 성립하지 않는다. 그래서 중복 판정을 하지 않는다.
 */
export const resolveResendErrorMessage = (mallCode: ShoppingMalls) =>
  MALL_ERROR_MESSAGES[mallCode] ?? FALLBACK_ERROR_MESSAGE;
```

- [ ] **Step 4: 생성 유틸을 공용 모듈 사용으로 전환한다**

`src/mocks/utils/createMallLinkedProducts.ts`를 아래 내용으로 **전체 교체**한다. 옮겨간 상수·헬퍼 정의는 지우고 import로 대체하며, 나머지 로직과 주석은 그대로 유지한다.

```typescript
import {
  CreateMallLinkedProductsResult,
  MallLinkedProduct,
  MallLinkedProductRequestItem,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import {
  createExternalProductId,
  createLinkedProductId,
  isSendSuccess,
  nextSequence,
  resolveErrorMessage,
} from './mallLinkSimulation';

/**
 * 전송 시점의 상품·설정 값을 스냅샷으로 복사해 연동 데이터를 새로 만든다.
 * 같은 조합이 이미 있어도 갱신하지 않고 항상 새 건을 추가한다 — 연동 데이터 1건 = 외부몰 상품 1개.
 */
export const createMockMallLinkedProducts = (
  items: MallLinkedProductRequestItem[],
  ownerId: string,
  createdByEmail: string,
): CreateMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: CreateMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === item.shoppingSettingId);
    if (!product || !setting) return;

    const isSuccess = isSendSuccess();
    // 실패 사유 판정은 이번 건을 배열에 넣기 전에 해야 한다. 넣은 뒤에 하면 자기 자신을 중복으로 본다.
    // mallCode는 클라이언트가 보낸 item이 아니라 조회된 setting에서 가져온다 — 어긋난 쌍이 오면
    // settingSnapshot.mallCode와 레코드의 mallCode가 갈라져 몰/쇼핑몰계정 필터가 서로 다른 답을 낸다.
    const errorMessage = isSuccess ? undefined : resolveErrorMessage(item.productId, setting.mallCode, ownerId);
    const sequence = nextSequence();

    const linked: MallLinkedProduct = {
      id: createLinkedProductId(sequence),
      ownerId,
      sourceProductId: product.productId,
      sourceShoppingSettingId: setting.id,
      mallCode: setting.mallCode,
      status: isSuccess ? 'success' : 'failed',
      externalProductId: isSuccess ? createExternalProductId(setting.mallCode, sequence) : undefined,
      errorMessage,
      // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 오리지널과 공유되어 스냅샷 독립성이 깨진다.
      productSnapshot: structuredClone(product),
      settingSnapshot: structuredClone(setting),
      createdByEmail,
      createdAt: now,
      lastSentAt: now,
      updatedAt: now,
    };

    MOCK_MALL_LINKED_PRODUCT_DATA.push(linked);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
```

- [ ] **Step 5: 기존 테스트가 그대로 통과하는지 확인한다 (회귀 확인)**

Run: `npx vitest run src/mocks/utils/createMallLinkedProducts.test.ts`
Expected: PASS (9 tests) — Step 1과 동일한 결과.

테스트는 `vi.mock('../data/MockMallLinkedProductsData', ...)`로 모듈 경로를 모킹한다. `mallLinkSimulation.ts`도 같은 디렉토리(`src/mocks/utils/`)에서 **같은 상대 경로**로 그 모듈을 import하므로 모킹이 그대로 적용된다. 만약 "중복 등록 메시지" 테스트가 실패한다면 시뮬레이션 모듈이 다른 경로로 import하고 있는 것이니 경로를 맞춘다.

- [ ] **Step 6: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 출력 없음 (에러 0건)

- [ ] **Step 7: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add src/mocks/utils/mallLinkSimulation.ts src/mocks/utils/createMallLinkedProducts.ts src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts
git commit -m "refactor: 외부몰 전송 시뮬레이션을 공용 모듈로 분리하고 수정·재전송 타입 추가"
```

---

## Task 2: 연동 데이터 단건 조회

수정 화면 진입 시 쓸 단건 조회를 만든다. 소유자가 아니거나 없는 id면 **둘 다 404**로 응답한다 — 남의 데이터가 존재한다는 사실 자체를 알리지 않기 위해서이며, 기존 `handlers/products.ts`의 단건 조회와 같은 방식이다.

**Files:**
- Create: `src/mocks/utils/getMallLinkedProduct.ts`
- Create: `src/mocks/utils/getMallLinkedProduct.test.ts`
- Modify: `src/mocks/handlers/mallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/getMallLinkedProduct.ts`
- Create: `src/features/mallLinkedProduct/api/useGetMallLinkedProduct.ts`

**Interfaces:**
- Consumes: Task 1의 타입들
- Produces:
  - `getMockMallLinkedProduct(id: string, ownerId: string | null): MallLinkedProduct | null`
  - `getMallLinkedProduct(id: string, ownerId: string): Promise<MallLinkedProduct>`
  - `useGetMallLinkedProduct(id: string)` — TanStack Query 결과
  - `MALL_LINKED_PRODUCT_QUERY_KEY = 'mallLinkedProduct'` (단수형. 목록의 `MALL_LINKED_PRODUCTS_QUERY_KEY`와 다른 키다)

- [ ] **Step 1: 실패 테스트를 작성한다**

`src/mocks/utils/getMallLinkedProduct.test.ts`를 만든다.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const OWNER_ID = 'usr_001';
const OTHER_OWNER_ID = 'usr_999';

const { LINKED, resetMocks } = vi.hoisted(() => {
  const makeLinked = (id: string, ownerId: string): MallLinkedProduct =>
    ({
      id,
      ownerId,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: `ext_NSST_${id}`,
      productSnapshot: { productId: 'p_001', name: '상품-p_001', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: 'NSST', nickname: '설정-ss_001' },
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks();

  return { LINKED, resetMocks };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { getMockMallLinkedProduct } from './getMallLinkedProduct';

describe('getMockMallLinkedProduct', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('소유자의 연동 데이터를 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_001', OWNER_ID)?.id).toBe('mlp_001');
  });

  it('다른 소유자의 데이터는 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_002', OWNER_ID)).toBeNull();
  });

  it('없는 id는 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_999', OWNER_ID)).toBeNull();
  });

  it('ownerId가 없으면 null을 반환한다', () => {
    expect(getMockMallLinkedProduct('mlp_001', null)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/mocks/utils/getMallLinkedProduct.test.ts`
Expected: FAIL — `Failed to resolve import "./getMallLinkedProduct"`

- [ ] **Step 3: 조회 유틸을 구현한다**

`src/mocks/utils/getMallLinkedProduct.ts`:

```typescript
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 연동 데이터 단건 조회.
 * 없는 id와 남의 데이터를 구분하지 않고 둘 다 null을 반환한다 — 핸들러가 이를 404로 변환해
 * 남의 데이터가 존재한다는 사실 자체를 응답으로 노출하지 않는다.
 */
export const getMockMallLinkedProduct = (id: string, ownerId: string | null): MallLinkedProduct | null => {
  const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
  if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) return null;
  return linked;
};
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/mocks/utils/getMallLinkedProduct.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 핸들러를 추가한다**

`src/mocks/handlers/mallLinkedProducts.ts`를 수정한다. import 두 줄을 추가하고:

```typescript
import { getMockMallLinkedProduct } from '../utils/getMallLinkedProduct';
```

배열의 **맨 끝**(기존 `POST /linked-products` 다음)에 아래 핸들러를 추가한다. 고정 경로(`/list`)가 앞에 있고 동적 경로가 뒤에 오는 순서를 지킨다.

```typescript
  http.get(`${baseUrl}/api/shopping/linked-products/:id`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const linked = getMockMallLinkedProduct(params.id as string, ownerId);
    if (!linked) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(linked);
  }),
```

- [ ] **Step 6: API 래퍼와 훅을 만든다**

`src/features/mallLinkedProduct/api/getMallLinkedProduct.ts`:

```typescript
import { MallLinkedProduct } from '../types/mallLinkedProduct.types';

export const getMallLinkedProduct = async (id: string, ownerId: string): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 조회 실패');
  }

  return response.json();
};
```

`src/features/mallLinkedProduct/api/useGetMallLinkedProduct.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getMallLinkedProduct } from './getMallLinkedProduct';

export const MALL_LINKED_PRODUCT_QUERY_KEY = 'mallLinkedProduct';

export const useGetMallLinkedProduct = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getMallLinkedProduct(id, workspaceOwnerId),
    enabled: !!workspaceOwnerId && !!id,
  });
};
```

- [ ] **Step 7: 타입 체크와 린트**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 새로 만든 파일에 대한 경고·에러 없음 (기존 파일의 경고 3건은 이 작업과 무관하며 그대로 남아 있어도 된다)

- [ ] **Step 8: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add src/mocks/utils/getMallLinkedProduct.ts src/mocks/utils/getMallLinkedProduct.test.ts src/mocks/handlers/mallLinkedProducts.ts src/features/mallLinkedProduct/api/getMallLinkedProduct.ts src/features/mallLinkedProduct/api/useGetMallLinkedProduct.ts
git commit -m "feat: 쇼핑몰 연동 상품 단건 조회 API 추가"
```

---

## Task 3: 저장 (스냅샷 수정)

스냅샷만 교체하고 전송 관련 필드(`status`·`lastSentAt`·`externalProductId`)는 **건드리지 않는다.** 이 Task의 테스트 3번이 그 규칙을 못 박는 핵심이다.

**Files:**
- Create: `src/mocks/utils/updateMallLinkedProduct.ts`
- Create: `src/mocks/utils/updateMallLinkedProduct.test.ts`
- Modify: `src/mocks/handlers/mallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/updateMallLinkedProduct.ts`
- Create: `src/features/mallLinkedProduct/api/useUpdateMallLinkedProduct.ts`

**Interfaces:**
- Consumes: `UpdateMallLinkedProductBody` (Task 1), `MALL_LINKED_PRODUCT_QUERY_KEY` (Task 2), `MALL_LINKED_PRODUCTS_QUERY_KEY` (기존 `useGetMallLinkedProducts.ts`)
- Produces:
  - `updateMockMallLinkedProduct(id: string, ownerId: string | null, body: UpdateMallLinkedProductBody): MallLinkedProduct | null`
  - `updateMallLinkedProduct(id: string, ownerId: string, body: UpdateMallLinkedProductBody): Promise<MallLinkedProduct>`
  - `useUpdateMallLinkedProduct(id: string)` — `mutate`/`mutateAsync`가 `MallLinkedProductSnapshots`를 받는다
  - `MallLinkedProductSnapshots = { productSnapshot: Product; settingSnapshot: ShoppingSetting }`

- [ ] **Step 1: 실패 테스트를 작성한다**

`src/mocks/utils/updateMallLinkedProduct.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Product } from '@/features/products/types/product.types';
import type { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import type {
  MallLinkedProduct,
  UpdateMallLinkedProductBody,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const EDITOR_EMAIL = 'editor@shop.com';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

// vi.hoisted 콜백은 모듈 스코프 const 선언보다 먼저 실행된다.
// 콜백 안에서 바깥 상수를 참조하면 TDZ ReferenceError가 나므로, 콜백이 쓰는 상수는 안에서 선언하고
// 바깥에서도 필요한 것만 반환받는다.
const { LINKED, resetMocks, OWNER_ID } = vi.hoisted(() => {
  const OWNER_ID = 'usr_001';
  const OTHER_OWNER_ID = 'usr_999';

  const makeLinked = (id: string, ownerId: string): MallLinkedProduct =>
    ({
      id,
      ownerId,
      sourceProductId: 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: 'NSST',
      status: 'success',
      externalProductId: 'ext_NSST_keep1',
      productSnapshot: { productId: 'p_001', name: '원본 상품명', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: 'NSST', nickname: '원본 설정명' },
      createdByEmail: 'seller@shop.com',
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks();

  return { LINKED, resetMocks, OWNER_ID };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { updateMockMallLinkedProduct } from './updateMallLinkedProduct';

const makeBody = (overrides?: {
  productName?: string;
  nickname?: string;
  settingMallCode?: string;
}): UpdateMallLinkedProductBody => ({
  updatedByEmail: EDITOR_EMAIL,
  productSnapshot: {
    productId: 'p_001',
    name: overrides?.productName ?? '수정된 상품명',
    price: 20000,
    informationDisclosure: { key: '', id: '', name: '고시정보', fields: {} },
  } as unknown as Product,
  settingSnapshot: {
    id: 'ss_001',
    mallCode: overrides?.settingMallCode ?? 'NSST',
    nickname: overrides?.nickname ?? '수정된 설정명',
  } as unknown as ShoppingSetting,
});

describe('updateMockMallLinkedProduct', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('상품·설정 스냅샷을 새 값으로 교체한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.price).toBe(20000);
    expect(LINKED[0].settingSnapshot.nickname).toBe('수정된 설정명');
  });

  it('수정 시각과 수정자를 기록한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].updatedByEmail).toBe(EDITOR_EMAIL);
    expect(LINKED[0].updatedAt).not.toBe(ORIGINAL_TIME);
  });

  it('전송 관련 필드(status·lastSentAt·externalProductId)를 건드리지 않는다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
  });

  it('불변 식별 정보와 생성 정보를 건드리지 않는다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody());

    expect(LINKED[0].sourceProductId).toBe('p_001');
    expect(LINKED[0].sourceShoppingSettingId).toBe('ss_001');
    expect(LINKED[0].createdAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].createdByEmail).toBe('seller@shop.com');
  });

  it('스냅샷을 깊은 복사로 저장한다 — 저장 후 호출자가 본문을 바꿔도 영향받지 않는다', () => {
    const body = makeBody();
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, body);

    body.productSnapshot.name = '나중에 바꾼 이름';
    body.productSnapshot.informationDisclosure.name = '나중에 바꾼 고시정보';

    expect(LINKED[0].productSnapshot.name).toBe('수정된 상품명');
    expect(LINKED[0].productSnapshot.informationDisclosure.name).toBe('고시정보');
  });

  it('설정 스냅샷에 다른 몰 코드가 실려 와도 레코드의 mallCode로 고정한다', () => {
    updateMockMallLinkedProduct('mlp_001', OWNER_ID, makeBody({ settingMallCode: 'KAKAOS' }));

    expect(LINKED[0].mallCode).toBe('NSST');
    expect(LINKED[0].settingSnapshot.mallCode).toBe('NSST');
  });

  it('다른 소유자의 데이터는 수정하지 않고 null을 반환한다', () => {
    const result = updateMockMallLinkedProduct('mlp_002', OWNER_ID, makeBody());

    expect(result).toBeNull();
    expect(LINKED[1].productSnapshot.name).toBe('원본 상품명');
    expect(LINKED[1].updatedByEmail).toBeUndefined();
  });

  it('없는 id면 null을 반환한다', () => {
    expect(updateMockMallLinkedProduct('mlp_999', OWNER_ID, makeBody())).toBeNull();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/mocks/utils/updateMallLinkedProduct.test.ts`
Expected: FAIL — `Failed to resolve import "./updateMallLinkedProduct"`

- [ ] **Step 3: 저장 유틸을 구현한다**

`src/mocks/utils/updateMallLinkedProduct.ts`:

```typescript
import {
  MallLinkedProduct,
  UpdateMallLinkedProductBody,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import { isOwnerMatch } from './verifyOwnership';

/**
 * 연동 데이터의 스냅샷만 교체한다.
 * status·lastSentAt·externalProductId는 전송 액션의 소관이라 여기서 건드리지 않는다 —
 * 저장과 재전송을 분리한 의미가 이 경계에 있다.
 */
export const updateMockMallLinkedProduct = (
  id: string,
  ownerId: string | null,
  body: UpdateMallLinkedProductBody,
): MallLinkedProduct | null => {
  const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id);
  if (!linked || !isOwnerMatch(linked.ownerId, ownerId)) return null;

  // 몰 코드는 레코드가 정본이다. 스냅샷이 다른 몰로 실려 와도 레코드 값으로 고정한다 —
  // 둘이 갈라지면 목록의 몰 필터와 쇼핑몰계정 필터가 서로 다른 답을 낸다.
  const settingSnapshot = {
    ...structuredClone(body.settingSnapshot),
    mallCode: linked.mallCode,
  } as ShoppingSetting;

  // 깊은 복사를 쓴다. 얕은 복사면 중첩 객체가 요청 본문과 공유되어 스냅샷 독립성이 깨진다.
  linked.productSnapshot = structuredClone(body.productSnapshot);
  linked.settingSnapshot = settingSnapshot;
  linked.updatedByEmail = body.updatedByEmail;
  linked.updatedAt = new Date().toISOString();

  return linked;
};
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/mocks/utils/updateMallLinkedProduct.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: 핸들러를 추가한다**

`src/mocks/handlers/mallLinkedProducts.ts`에 import를 추가하고:

```typescript
import { updateMockMallLinkedProduct } from '../utils/updateMallLinkedProduct';
import { UpdateMallLinkedProductBody } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
```

`GET /:id` 핸들러 **다음에** 추가한다:

```typescript
  http.patch(`${baseUrl}/api/shopping/linked-products/:id`, async ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const body = (await request.json()) as UpdateMallLinkedProductBody;
    const updated = updateMockMallLinkedProduct(params.id as string, ownerId, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
```

- [ ] **Step 6: API 래퍼와 훅을 만든다**

`src/features/mallLinkedProduct/api/updateMallLinkedProduct.ts`:

```typescript
import { MallLinkedProduct, UpdateMallLinkedProductBody } from '../types/mallLinkedProduct.types';

export const updateMallLinkedProduct = async (
  id: string,
  ownerId: string,
  body: UpdateMallLinkedProductBody,
): Promise<MallLinkedProduct> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 저장 실패');
  }

  return response.json();
};
```

`src/features/mallLinkedProduct/api/useUpdateMallLinkedProduct.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { updateMallLinkedProduct } from './updateMallLinkedProduct';

export interface MallLinkedProductSnapshots {
  productSnapshot: Product;
  settingSnapshot: ShoppingSetting;
}

export const useUpdateMallLinkedProduct = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshots: MallLinkedProductSnapshots) =>
      updateMallLinkedProduct(id, workspaceOwnerId, { updatedByEmail: email, ...snapshots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY, id] });
    },
  });
};
```

- [ ] **Step 7: 타입 체크와 린트**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 새 파일에 대한 경고·에러 없음

- [ ] **Step 8: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add src/mocks/utils/updateMallLinkedProduct.ts src/mocks/utils/updateMallLinkedProduct.test.ts src/mocks/handlers/mallLinkedProducts.ts src/features/mallLinkedProduct/api/updateMallLinkedProduct.ts src/features/mallLinkedProduct/api/useUpdateMallLinkedProduct.ts
git commit -m "feat: 쇼핑몰 연동 상품 스냅샷 저장 API 추가"
```

---

## Task 4: 재전송

현재 스냅샷을 외부몰로 다시 보낸다. 스냅샷과 수정 필드는 **건드리지 않고**, `status`·`lastSentAt`·`externalProductId`만 갱신한다.

**Files:**
- Create: `src/mocks/utils/resendMallLinkedProducts.ts`
- Create: `src/mocks/utils/resendMallLinkedProducts.test.ts`
- Modify: `src/mocks/utils/verifyOwnership.ts`
- Modify: `src/mocks/handlers/mallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/resendMallLinkedProducts.ts`
- Create: `src/features/mallLinkedProduct/api/useResendMallLinkedProducts.ts`

**Interfaces:**
- Consumes: Task 1의 `isSendSuccess`/`nextSequence`/`createExternalProductId`/`resolveErrorMessage`/`resolveResendErrorMessage`, `ResendMallLinkedProductsBody`, `ResendMallLinkedProductsResult`
- Produces:
  - `resendMockMallLinkedProducts(ids: string[], ownerId: string): ResendMallLinkedProductsResult`
  - `areLinkedProductsOwnedBy(ids: string[], requestOwnerId: string | null): boolean`
  - `resendMallLinkedProducts(ownerId: string, ids: string[]): Promise<ResendMallLinkedProductsResult>`
  - `useResendMallLinkedProducts()` — `mutate`/`mutateAsync`가 `string[]`(id 배열)을 받는다

- [ ] **Step 1: 실패 테스트를 작성한다**

`src/mocks/utils/resendMallLinkedProducts.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MallLinkedProduct, MallLinkStatus } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

const OWNER_ID = 'usr_001';
const ORIGINAL_TIME = '2026-08-01T00:00:00.000Z';

type LinkedOverrides = {
  status?: MallLinkStatus;
  externalProductId?: string;
  mallCode?: string;
  sourceProductId?: string;
  ownerId?: string;
};

const { LINKED, resetMocks, makeLinked } = vi.hoisted(() => {
  const makeLinked = (id: string, overrides?: LinkedOverrides): MallLinkedProduct =>
    ({
      id,
      ownerId: overrides?.ownerId ?? 'usr_001',
      sourceProductId: overrides?.sourceProductId ?? 'p_001',
      sourceShoppingSettingId: 'ss_001',
      mallCode: overrides?.mallCode ?? 'NSST',
      status: overrides?.status ?? 'success',
      externalProductId: overrides?.externalProductId,
      productSnapshot: { productId: 'p_001', name: '상품-p_001', price: 10000 },
      settingSnapshot: { id: 'ss_001', mallCode: overrides?.mallCode ?? 'NSST', nickname: '설정-ss_001' },
      createdByEmail: 'seller@shop.com',
      updatedByEmail: undefined,
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSentAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    }) as unknown as MallLinkedProduct;

  const LINKED: MallLinkedProduct[] = [];

  const resetMocks = () => {
    LINKED.length = 0;
  };

  return { LINKED, resetMocks, makeLinked };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));

import { resendMockMallLinkedProducts } from './resendMallLinkedProducts';

// 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalProductId 생성에도 난수를 쓰므로
// mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

describe('resendMockMallLinkedProducts', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('성공 시 기존 외부 상품코드를 유지하고 전송 시각을 갱신한다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'failed', externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
    expect(LINKED[0].status).toBe('success');
    expect(LINKED[0].errorMessage).toBeUndefined();
    expect(LINKED[0].lastSentAt).not.toBe(ORIGINAL_TIME);
  });

  it('실패해도 외부 상품코드를 지우지 않는다 — 외부몰 상품은 이전 값으로 살아있다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.05);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 1, successCount: 0, failCount: 1 });
    expect(LINKED[0].status).toBe('failed');
    expect(LINKED[0].externalProductId).toBe('ext_NSST_keep1');
    expect(LINKED[0].errorMessage).toBe('카테고리 매핑 오류');
  });

  it('수정 필드(updatedAt·updatedByEmail)를 건드리지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].updatedAt).toBe(ORIGINAL_TIME);
    expect(LINKED[0].updatedByEmail).toBeUndefined();
  });

  it('스냅샷을 건드리지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { externalProductId: 'ext_NSST_keep1' }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].productSnapshot.name).toBe('상품-p_001');
    expect(LINKED[0].settingSnapshot.nickname).toBe('설정-ss_001');
  });

  it('외부 상품코드가 있으면 같은 상품·몰에 다른 성공 이력이 있어도 중복 사유로 실패하지 않는다', () => {
    LINKED.push(
      makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_other' }),
      makeLinked('mlp_002', { status: 'failed', externalProductId: 'ext_NSST_mine' }),
    );
    stubRandom(0.05);

    resendMockMallLinkedProducts(['mlp_002'], OWNER_ID);

    expect(LINKED[1].errorMessage).toBe('카테고리 매핑 오류');
  });

  it('외부 상품코드가 없는 건은 기존대로 중복 판정을 받는다', () => {
    LINKED.push(
      makeLinked('mlp_001', { status: 'success', externalProductId: 'ext_NSST_other' }),
      makeLinked('mlp_002', { status: 'failed', externalProductId: undefined }),
    );
    stubRandom(0.05);

    resendMockMallLinkedProducts(['mlp_002'], OWNER_ID);

    expect(LINKED[1].errorMessage).toBe('동일 상품이 이미 등록되어 있습니다');
  });

  it('외부 상품코드가 없던 건이 성공하면 새로 발급한다', () => {
    LINKED.push(makeLinked('mlp_001', { status: 'failed', externalProductId: undefined }));
    stubRandom(0.9);

    resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(LINKED[0].externalProductId).toMatch(/^ext_NSST_/);
  });

  it('여러 건을 처리하고 집계 결과를 반환한다', () => {
    LINKED.push(
      makeLinked('mlp_001', { externalProductId: 'ext_NSST_a' }),
      makeLinked('mlp_002', { externalProductId: 'ext_NSST_b' }),
      makeLinked('mlp_003', { externalProductId: 'ext_NSST_c' }),
    );
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001', 'mlp_002', 'mlp_003'], OWNER_ID);

    expect(result).toEqual({ totalCount: 3, successCount: 3, failCount: 0 });
  });

  it('다른 소유자의 id는 건너뛰고 집계에도 넣지 않는다', () => {
    LINKED.push(makeLinked('mlp_001', { ownerId: 'usr_999', externalProductId: 'ext_NSST_a' }));
    stubRandom(0.9);

    const result = resendMockMallLinkedProducts(['mlp_001'], OWNER_ID);

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
    expect(LINKED[0].lastSentAt).toBe(ORIGINAL_TIME);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/mocks/utils/resendMallLinkedProducts.test.ts`
Expected: FAIL — `Failed to resolve import "./resendMallLinkedProducts"`

- [ ] **Step 3: 재전송 유틸을 구현한다**

`src/mocks/utils/resendMallLinkedProducts.ts`:

```typescript
import {
  MallLinkedProduct,
  ResendMallLinkedProductsResult,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
import {
  createExternalProductId,
  isSendSuccess,
  nextSequence,
  resolveErrorMessage,
  resolveResendErrorMessage,
} from './mallLinkSimulation';

/** 연동 1건을 외부몰로 다시 보낸다. 성공 여부를 반환한다. */
const sendOnce = (linked: MallLinkedProduct, ownerId: string, now: string): boolean => {
  const isSuccess = isSendSuccess();
  const sequence = nextSequence();

  if (isSuccess) {
    // 이미 외부몰에 상품이 있으면 그 상품을 수정한 것이므로 코드를 유지한다.
    // 없으면(실패 이력만 있던 건) 이번이 첫 등록이라 새로 발급한다.
    linked.externalProductId = linked.externalProductId ?? createExternalProductId(linked.mallCode, sequence);
    linked.status = 'success';
    linked.errorMessage = undefined;
  } else {
    // externalProductId가 있다는 건 외부몰에 이미 상품이 있다는 뜻이고, 그 전송은 신규 등록이 아니라
    // '수정'이라 중복이라는 개념이 성립하지 않는다. 없을 때만 신규 등록 기준의 중복 판정을 쓴다.
    linked.errorMessage = linked.externalProductId
      ? resolveResendErrorMessage(linked.mallCode)
      : resolveErrorMessage(linked.sourceProductId, linked.mallCode, ownerId);
    linked.status = 'failed';
    // 실패해도 externalProductId는 지우지 않는다 — 외부몰 상품은 이전 값 그대로 살아있다.
  }

  linked.lastSentAt = now;
  return isSuccess;
};

/**
 * 선택된 연동 데이터를 외부몰로 다시 보낸다.
 * 스냅샷과 수정 필드(updatedAt·updatedByEmail)는 건드리지 않는다 —
 * 재전송은 값을 고치는 행위가 아니라 현재 값을 보내는 행위다.
 */
export const resendMockMallLinkedProducts = (ids: string[], ownerId: string): ResendMallLinkedProductsResult => {
  const now = new Date().toISOString();
  const result: ResendMallLinkedProductsResult = { totalCount: 0, successCount: 0, failCount: 0 };

  ids.forEach((id) => {
    const linked = MOCK_MALL_LINKED_PRODUCT_DATA.find((item) => item.id === id && item.ownerId === ownerId);
    if (!linked) return;

    const isSuccess = sendOnce(linked, ownerId, now);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/mocks/utils/resendMallLinkedProducts.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: 소유권 헬퍼를 추가한다**

`src/mocks/utils/verifyOwnership.ts` 파일 끝에 추가한다. 핸들러가 mock 데이터 배열을 직접 import하지 않게 하려는 것이며, 바로 위 `areMallLinkRequestsOwnedBy`와 같은 형태다.

```typescript
// 연동 데이터는 식별자가 `id`라 제네릭 allOwnedBy를 그대로 쓸 수 있다.
// 핸들러가 mock 데이터를 직접 import하지 않도록 얇은 래퍼로 감싼다 (msw-rules.md).
export const areLinkedProductsOwnedBy = (ids: string[], requestOwnerId: string | null): boolean =>
  allOwnedBy(ids, requestOwnerId, MOCK_MALL_LINKED_PRODUCT_DATA);
```

파일 상단 import에 아래를 추가한다:

```typescript
import { MOCK_MALL_LINKED_PRODUCT_DATA } from '../data/MockMallLinkedProductsData';
```

- [ ] **Step 6: 핸들러를 추가한다**

`src/mocks/handlers/mallLinkedProducts.ts`에 import를 추가하고:

```typescript
import { resendMockMallLinkedProducts } from '../utils/resendMallLinkedProducts';
import { areLinkedProductsOwnedBy } from '../utils/verifyOwnership';
import { ResendMallLinkedProductsBody } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
```

**동적 경로 `/:id` 핸들러들보다 앞에** 배치한다 (고정 경로 우선 규칙). 기존 `POST /api/shopping/linked-products` 바로 다음, `GET /:id` 앞이 적절하다.

```typescript
  http.post(`${baseUrl}/api/shopping/linked-products/resend`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, ids } = (await request.json()) as ResendMallLinkedProductsBody;

    if (!areLinkedProductsOwnedBy(ids, ownerId)) {
      return new HttpResponse(null, { status: 403 });
    }

    return HttpResponse.json(resendMockMallLinkedProducts(ids, ownerId));
  }),
```

- [ ] **Step 7: API 래퍼와 훅을 만든다**

`src/features/mallLinkedProduct/api/resendMallLinkedProducts.ts`:

```typescript
import { ResendMallLinkedProductsResult } from '../types/mallLinkedProduct.types';

export const resendMallLinkedProducts = async (
  ownerId: string,
  ids: string[],
): Promise<ResendMallLinkedProductsResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/linked-products/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ids }),
  });

  if (!response.ok) {
    throw new Error('쇼핑몰 연동 상품 재전송 실패');
  }

  return response.json();
};
```

`src/features/mallLinkedProduct/api/useResendMallLinkedProducts.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { MALL_LINKED_PRODUCTS_QUERY_KEY } from './useGetMallLinkedProducts';
import { MALL_LINKED_PRODUCT_QUERY_KEY } from './useGetMallLinkedProduct';
import { resendMallLinkedProducts } from './resendMallLinkedProducts';

export const useResendMallLinkedProducts = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => resendMallLinkedProducts(workspaceOwnerId, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 8: 전체 테스트와 타입 체크**

Run: `npm run test`
Expected: 모든 테스트 파일 PASS. Task 1~4에서 추가한 21개 테스트가 늘어난 상태여야 한다.

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 새 파일에 대한 경고·에러 없음

- [ ] **Step 9: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add src/mocks/utils/resendMallLinkedProducts.ts src/mocks/utils/resendMallLinkedProducts.test.ts src/mocks/utils/verifyOwnership.ts src/mocks/handlers/mallLinkedProducts.ts src/features/mallLinkedProduct/api/resendMallLinkedProducts.ts src/features/mallLinkedProduct/api/useResendMallLinkedProducts.ts
git commit -m "feat: 쇼핑몰 연동 상품 재전송 API 추가"
```

---

## Task 5: 수정 화면

**Files:**
- Create: `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductInfoCard.tsx`
- Create: `src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx`
- Create: `src/app/(authenticated)/shopping/linked-products/[id]/page.tsx`

**Interfaces:**
- Consumes: `useGetMallLinkedProduct` (Task 2), `useUpdateMallLinkedProduct`·`MallLinkedProductSnapshots` (Task 3), `useResendMallLinkedProducts` (Task 4)
- Produces: `/shopping/linked-products/:id` 화면

**테스트 없음:** UI 컴포넌트는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md). 검증은 `npx tsc --noEmit` · `npm run build`와 Task 7의 수동 확인으로 한다.

- [ ] **Step 1: 읽기 전용 연동 정보 카드를 만든다**

`src/features/mallLinkedProduct/ui/[id]/MallLinkedProductInfoCard.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';

type Props = {
  linked: MallLinkedProduct;
};

const InfoRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="break-all">{children}</span>
  </div>
);

/**
 * 연동 데이터의 불변 식별 정보를 보여주는 읽기 전용 카드.
 * 수정 폼 바깥에 두는 이유는 이 값들이 폼으로 흘러들어가면 원본 추적 정보까지 수정 대상이 되기 때문이다.
 */
export const MallLinkedProductInfoCard = ({ linked }: Props) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">연동 정보</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-6 sm:grid-cols-3 lg:grid-cols-5">
        <InfoRow label="상품코드">{linked.sourceProductId}</InfoRow>
        <InfoRow label="쇼핑몰상품코드">{linked.externalProductId ?? '-'}</InfoRow>
        <InfoRow label="연동상태">
          <Badge variant={linked.status === 'success' ? 'default' : 'destructive'}>
            {linked.status === 'success' ? '성공' : '실패'}
          </Badge>
        </InfoRow>
        <InfoRow label="최종연동일시">{dayjs(linked.lastSentAt).format('YYYY-MM-DD HH:mm')}</InfoRow>
        <InfoRow label="등록자">{linked.createdByEmail}</InfoRow>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 수정 화면 레이아웃을 만든다**

`src/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';
import { Product } from '@/features/products/types/product.types';
import { ShoppingSetting, ShoppingSettingFormValues } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { buildMallSettingsPayload } from '@/features/shoppingSetting/util/buildMallSettingsPayload';
import { ProductBasicinfo } from '@/features/products/ui/components/form/ProductBasicInfo';
import { ProductPriceAndQuantityInfo } from '@/features/products/ui/components/form/ProductPriceAndQuantityInfo';
import { ProductComplianceSection } from '@/features/products/ui/components/form/ProductComplianceSection';
import { ProductOptionSection } from '@/features/products/ui/components/options/ProductOptionSection';
import { ProductMainImageInfo } from '@/features/products/ui/components/form/ProductMainImageInfo';
import { ProductDetailInfo } from '@/features/products/ui/components/form/ProductDetailInfo';
import { ProductInformationDisclosureSection } from '@/features/products/ui/components/productDisclosure/ProductInformationDisclosureSection';
import { ShoppingSettingBasicInfoSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingBasicInfoSection';
import { ShoppingSettingAddressSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingAddressSection';
import { ShoppingSettingMallInfoSection } from '@/features/shoppingSetting/ui/components/form/ShoppingSettingMallInfoSection';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { useGetMallLinkedProduct } from '../../api/useGetMallLinkedProduct';
import { MallLinkedProductSnapshots, useUpdateMallLinkedProduct } from '../../api/useUpdateMallLinkedProduct';
import { useResendMallLinkedProducts } from '../../api/useResendMallLinkedProducts';
import { MallLinkedProductInfoCard } from './MallLinkedProductInfoCard';

type Props = {
  id: string;
};

const LIST_PATH = '/shopping/linked-products';

const getMallName = (code: string) => SHOPPING_MALLS.find((mall) => mall.code === code)?.name ?? code;

export const MallLinkedProductEditLayout = ({ id }: Props) => {
  const router = useRouter();
  const { showAlert } = useAlert();

  const { data: linked, isLoading } = useGetMallLinkedProduct(id);
  const { mutateAsync: save, isPending: isSaving } = useUpdateMallLinkedProduct(id);
  const { mutateAsync: resend, isPending: isResending } = useResendMallLinkedProducts();

  // 상품 폼과 설정 폼을 따로 둔다. 두 폼의 값 타입이 다르고, 기존 섹션 컴포넌트들이
  // register('name') 같은 flat 경로를 쓰고 있어 하나로 합치려면 전 섹션을 고쳐야 한다.
  const productForm = useForm<Product>();
  const settingForm = useForm<ShoppingSettingFormValues>();

  useEffect(() => {
    if (!linked) return;
    productForm.reset(linked.productSnapshot);
    settingForm.reset(linked.settingSnapshot);
  }, [linked, productForm, settingForm]);

  const goList = () => router.push(LIST_PATH);

  const buildSnapshots = (record: MallLinkedProduct): MallLinkedProductSnapshots => {
    const settingValues = settingForm.getValues();
    // 몰 코드는 레코드가 정본이다. 폼에 몰 선택 필드가 없어 정상 경로에선 바뀌지 않지만,
    // 여기서도 레코드 값으로 고정해 스냅샷과 레코드가 갈라질 여지를 없앤다.
    const mallCode = record.mallCode;

    let mallSettings: ShoppingSetting['mallSettings'];
    if (mallCode === 'NSST') {
      mallSettings = buildMallSettingsPayload('NSST', settingValues.mallSettings);
    } else if (mallCode === 'KAKAOS') {
      mallSettings = buildMallSettingsPayload('KAKAOS', settingValues.mallSettings);
    } else {
      mallSettings = undefined;
    }

    return {
      productSnapshot: productForm.getValues(),
      settingSnapshot: { ...settingValues, mallCode, mallSettings } as ShoppingSetting,
    };
  };

  // 한쪽 폼만 통과한 상태로 저장하면 상품은 저장되고 설정은 안 된 반쪽 상태가 된다.
  const validateBothForms = async () => {
    const [isProductValid, isSettingValid] = await Promise.all([productForm.trigger(), settingForm.trigger()]);
    return isProductValid && isSettingValid;
  };

  const handleSave = async () => {
    if (!linked || !(await validateBothForms())) return;

    try {
      await save(buildSnapshots(linked));
      showAlert({ message: '저장되었습니다.', type: 'success', onConfirm: goList });
    } catch {
      showAlert({ message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
    }
  };

  const handleSaveAndResend = async () => {
    if (!linked || !(await validateBothForms())) return;

    try {
      await save(buildSnapshots(linked));
    } catch {
      // 저장이 실패하면 전송하지 않는다. 고치지 못한 값을 몰로 보내는 셈이 되기 때문이다.
      showAlert({ message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      return;
    }

    try {
      const { successCount } = await resend([id]);
      if (successCount === 1) {
        showAlert({ message: '저장 후 쇼핑몰로 전송되었습니다.', type: 'success', onConfirm: goList });
        return;
      }
      // 저장은 됐다는 사실을 반드시 함께 알린다. 안 그러면 사용자가 같은 수정을 다시 하게 된다.
      showAlert({
        message: '저장은 완료되었으나 전송에 실패했습니다. 목록에서 실패 사유를 확인해주세요.',
        type: 'warning',
        onConfirm: goList,
      });
    } catch {
      showAlert({
        message: '저장은 완료되었으나 전송 중 오류가 발생했습니다. 목록에서 다시 시도해주세요.',
        type: 'warning',
        onConfirm: goList,
      });
    }
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>;
  }

  if (!linked) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        연동 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  const isBusy = isSaving || isResending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">쇼핑몰 연동 상품 수정</h1>
        <p className="text-muted-foreground">
          {getMallName(linked.mallCode)} · {linked.settingSnapshot.nickname}
        </p>
      </div>

      <MallLinkedProductInfoCard linked={linked} />

      <FormProvider {...productForm}>
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductBasicinfo />
            <ProductPriceAndQuantityInfo />
          </div>
          <ProductComplianceSection />
          <ProductOptionSection />
          <div className="grid gap-6 lg:grid-cols-2">
            <ProductMainImageInfo />
            <ProductDetailInfo />
          </div>
          <ProductInformationDisclosureSection />
        </div>
      </FormProvider>

      <FormProvider {...settingForm}>
        <div className="space-y-6">
          <ShoppingSettingBasicInfoSection />
          <ShoppingSettingAddressSection />
          <ShoppingSettingMallInfoSection />
        </div>
      </FormProvider>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={goList} disabled={isBusy}>
          취소
        </Button>
        <Button type="button" variant="outline" onClick={handleSave} disabled={isBusy}>
          저장
        </Button>
        <Button type="button" onClick={handleSaveAndResend} disabled={isBusy}>
          저장 후 재전송
        </Button>
      </div>
    </div>
  );
};
```

`<form>` 엘리먼트를 쓰지 않고 버튼에 `type="button"` + `onClick`을 다는 이유는 폼이 둘이라 하나의 `handleSubmit`으로 묶을 수 없기 때문이다. 유효성 검사는 `trigger()`로 직접 돌린다.

- [ ] **Step 3: 라우트를 만든다**

`src/app/(authenticated)/shopping/linked-products/[id]/page.tsx`:

```tsx
import { MallLinkedProductEditLayout } from '@/features/mallLinkedProduct/ui/[id]/MallLinkedProductEditLayout';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MallLinkedProductEditPage({ params }: Props) {
  const { id } = await params;
  return <MallLinkedProductEditLayout id={id} />;
}
```

- [ ] **Step 4: 타입 체크 · 린트 · 빌드**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 새 파일에 대한 경고·에러 없음

Run: `npm run build`
Expected: 빌드 성공. 라우트 목록에 `/shopping/linked-products/[id]`가 나타난다.

- [ ] **Step 5: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add "src/features/mallLinkedProduct/ui/[id]" "src/app/(authenticated)/shopping/linked-products/[id]"
git commit -m "feat: 쇼핑몰 연동 상품 수정 화면 및 라우트 추가"
```

---

## Task 6: 목록 화면 — 액션 컬럼 · 수정일 컬럼 · 일괄 재전송

**Files:**
- Modify: `src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts`
- Modify: `src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx`
- Modify: `src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`

**Interfaces:**
- Consumes: `useResendMallLinkedProducts` (Task 4), `selectedLinkedIdsAtom` (기존 `store/selection.store.ts`)

**테스트 없음:** UI 컴포넌트는 테스트 범위 밖이다. 검증은 `npm run build`와 Task 7의 수동 확인으로 한다.

- [ ] **Step 1: 테이블 헤더 상수에 컬럼 2개를 추가한다**

`src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts`의 `MALL_LINKED_PRODUCT_TABLE_HEAD`를 아래로 교체한다. 마지막 두 줄이 새로 추가되는 부분이다.

```typescript
export const MALL_LINKED_PRODUCT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode', title: '상품코드', width: 'w-32' },
  { id: 'productName', title: '상품명' },
  { id: 'mallCode', title: '연동몰', width: 'w-28' },
  { id: 'settingNickname', title: '쇼핑몰계정', width: 'w-32' },
  { id: 'externalProductId', title: '쇼핑몰상품코드', width: 'w-40' },
  { id: 'price', title: '판매가', width: 'w-28' },
  { id: 'saleState', title: '판매상태', width: 'w-24' },
  { id: 'linkStatus', title: '연동상태', width: 'w-44' },
  { id: 'lastSentAt', title: '최종연동일시', width: 'w-36' },
  { id: 'updatedAt', title: '수정일', width: 'w-36' },
  { id: 'action', title: '관리', width: 'w-24' },
];
```

**다음 Step에서 바디 셀 2개를 같이 추가해야 한다.** 이 Step만 하고 멈추면 컬럼이 밀린다.

- [ ] **Step 2: 테이블 바디에 셀 2개를 추가한다**

`src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx`를 수정한다.

import 두 줄을 추가한다:

```typescript
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
```

컴포넌트 최상단에 라우터를 선언한다:

```typescript
  const router = useRouter();
```

최종연동일시 셀(`{dayjs(linked.lastSentAt).format('YYYY-MM-DD HH:mm')}`) **바로 다음에** 두 셀을 추가한다:

```tsx
                <TableCell className="text-center">{dayjs(linked.updatedAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/shopping/linked-products/${linked.id}`)}
                  >
                    수정
                  </Button>
                </TableCell>
```

빈 상태 행의 `colSpan={MALL_LINKED_PRODUCT_TABLE_HEAD.length + 1}`은 배열 길이 기반이라 자동으로 따라간다 — 수정할 필요 없다.

- [ ] **Step 3: 헤더/바디 컬럼 수가 맞는지 세어 확인한다**

헤더: `MALL_LINKED_PRODUCT_TABLE_HEAD` 11개 + 체크박스 1개 = **12개**
바디: 체크박스 + 상품코드 + 상품명 + 연동몰 + 쇼핑몰계정 + 쇼핑몰상품코드 + 판매가 + 판매상태 + 연동상태 + 최종연동일시 + 수정일 + 관리 = **12개**

두 값이 다르면 다음 Step으로 넘어가지 말고 맞춘다.

- [ ] **Step 4: 테이블 섹션에 일괄 재전송 버튼을 붙인다**

`src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx`를 아래 내용으로 전체 교체한다.

```tsx
'use client';

import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/common/TablePagination';
import { useAlert } from '@/hooks/useAlert';
import { MallLinkedProduct } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { selectedLinkedIdsAtom } from '@/features/mallLinkedProduct/store/selection.store';
import { useResendMallLinkedProducts } from '@/features/mallLinkedProduct/api/useResendMallLinkedProducts';
import { MallLinkedProductTable } from './components/MallLinkedProductTable';

type Props = {
  linkedProducts: MallLinkedProduct[];
  total: number;
  totalPages: number;
  currentPage: number;
  onChangePage: (page: number) => void;
  isLoading?: boolean;
};

export const MallLinkedProductTableSection = ({
  linkedProducts,
  total,
  totalPages,
  currentPage,
  onChangePage,
  isLoading,
}: Props) => {
  const [selectedLinkedIds, setSelectedLinkedIds] = useAtom(selectedLinkedIdsAtom);
  const { mutate: resend, isPending } = useResendMallLinkedProducts();
  const { showAlert } = useAlert();

  const handleResend = () => {
    if (selectedLinkedIds.length === 0) {
      showAlert({ message: '재전송할 연동 상품을 선택해주세요.', type: 'warning' });
      return;
    }

    resend(selectedLinkedIds, {
      onSuccess: ({ totalCount, successCount, failCount }) => {
        // 결과와 무관하게 선택을 비운다. 목록을 다시 불러오므로 처리된 행이 계속 체크돼 있으면 혼란스럽다.
        // 실패 건은 목록에 사유와 함께 남아 거기서 다시 조치한다.
        setSelectedLinkedIds([]);

        if (failCount === 0) {
          showAlert({ message: `${successCount}건이 쇼핑몰로 전송되었습니다.`, type: 'success' });
          return;
        }

        showAlert({
          message: `총 ${totalCount}건 중 ${successCount}건 전송 성공, ${failCount}건 실패했습니다.`,
          type: 'warning',
        });
      },
      onError: () => {
        setSelectedLinkedIds([]);
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">전체 {isLoading ? '-' : total}건</CardTitle>
          <Button size="sm" onClick={handleResend} disabled={isPending || selectedLinkedIds.length === 0}>
            선택 재전송{selectedLinkedIds.length > 0 ? ` (${selectedLinkedIds.length})` : ''}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <>
            <MallLinkedProductTable linkedProducts={linkedProducts} />
            <TablePagination currentPage={currentPage} totalPages={totalPages} onChangePage={onChangePage} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

`'use client'`가 새로 필요하다 — 이 컴포넌트가 이제 훅을 쓴다.

- [ ] **Step 5: 타입 체크 · 린트 · 빌드**

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 변경한 파일에 대한 경고·에러 없음

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add src/features/mallLinkedProduct/constant/mallLinkedProduct.constants.ts src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx
git commit -m "feat: 연동 상품 목록에 수정 진입점·수정일 컬럼·일괄 재전송 추가"
```

---

## Task 7: 전체 검증과 도메인 규칙 문서화

**Files:**
- Modify: `.claude/rules/domain-design.md`

- [ ] **Step 1: 전체 자동 검증**

Run: `npm run test`
Expected: 모든 테스트 PASS. 기존 143개 + 이번 라운드 23개 = **166개**

(계획 시점엔 21개로 잡았으나 Task 4에서 2개가 늘었다 — `verifyOwnership.ts`에 연동 데이터 import를 추가하면서 기존 `verifyOwnership.test.ts`에 모듈 목킹이 필요해졌고, 새 헬퍼 `areLinkedProductsOwnedBy`용 테스트 2개를 함께 넣었다.)

Run: `npx tsc --noEmit`
Expected: 출력 없음

Run: `npm run lint`
Expected: 이 작업으로 새로 생긴 경고·에러 없음

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 2: 수동 동작 확인**

`npm run dev` 후 `/shopping/linked-products`에서 아래를 순서대로 확인한다.

1. **컬럼 정렬** — 수정일·관리 컬럼이 헤더와 어긋나지 않고, 각 셀 값이 헤더와 맞는 자리에 있다
2. **수정 화면 진입** — `[수정]` 클릭 시 `/shopping/linked-products/{id}`로 이동하고, 상품·설정 폼에 스냅샷 값이 채워져 있다
3. **연동 정보 카드** — 상품코드·쇼핑몰상품코드·연동상태·최종연동일시·등록자가 보이고 편집할 수 없다
4. **저장** — 상품명을 바꾸고 `[저장]` → 알림 후 목록으로 이동. **수정일만 바뀌고 최종연동일시·연동상태는 그대로**다
5. **오리지널 독립성** — `/products/list`에서 같은 상품을 열어보면 4번에서 바꾼 이름이 **반영돼 있지 않다**
6. **저장 후 재전송** — 다시 수정 화면에서 값을 바꾸고 `[저장 후 재전송]` → 최종연동일시와 수정일이 **둘 다** 갱신된다
7. **실패 케이스** — 6번을 여러 번 반복하면 10% 확률로 실패한다. 실패 시 연동상태가 '실패'로 바뀌지만 **쇼핑몰상품코드는 그대로 남아 있다**
8. **일괄 재전송** — 목록에서 여러 행을 체크하고 `[선택 재전송]` → 결과 알림 후 **체크가 전부 풀린다**
9. **선택 초기화** — 체크한 상태에서 페이지를 옮기거나 재검색하면 체크가 풀린다 (기존 동작 회귀 확인)
10. **옵션 조합 테이블 표시** — 수정 화면의 옵션 섹션에 기존 옵션이 보이는지 확인한다. `ProductOptionSection`은 확정된 옵션을 로컬 `useState`로만 들고 있어 폼 `reset()`으로는 조합 테이블이 안 채워질 수 있다. **저장 값 자체는 폼에 남아 유실되지 않지만**(옵션을 건드리지 않고 저장해도 원래 옵션이 보존된다) 화면상 비어 보일 수 있다. 기존 `/products/[id]` 수정 화면도 같은 구조이니 그쪽과 동작이 같은지 비교하면 된다. 다르면 이번 라운드의 회귀, 같으면 기존 제약이다.
11. **세션 하이드레이션** — 수정 화면 URL에서 새로고침했을 때 "연동 데이터를 찾을 수 없습니다"가 잠깐이라도 뜨지 않고 "불러오는 중..."이 뜨는지 확인한다. `/shopping/settings/[id]`와 `/shopping/accounts/[id]`도 같이 확인한다 (이번에 함께 고친 화면들이다).

- [ ] **Step 3: 도메인 규칙을 문서에 반영한다**

`.claude/rules/domain-design.md`의 "오리지널 데이터와 쇼핑몰 연동 데이터" 절 끝에 아래를 추가한다.

```markdown
### 연동 데이터의 저장과 재전송

연동 데이터를 고치는 것과 그것을 외부몰로 보내는 것은 **별개 액션**이다.

- **저장** — 스냅샷(`productSnapshot`·`settingSnapshot`)만 교체하고 `updatedAt`·`updatedByEmail`을 갱신한다. `status`·`lastSentAt`·`externalProductId`는 건드리지 않는다.
- **재전송** — 현재 스냅샷을 외부몰로 보내고 `status`·`lastSentAt`을 갱신한다. 스냅샷과 `updatedAt`은 건드리지 않는다.

`externalProductId`의 유무가 **"외부몰에 이 상품이 존재하는가"의 단일 판정 기준**이다.

- 값이 있으면 그 전송은 신규 등록이 아니라 **기존 외부몰 상품의 수정**이다. 코드를 유지하고, 중복 판정을 하지 않는다.
- 값이 없으면 신규 등록이므로 중복 판정(같은 상품 × 같은 몰에 성공 이력이 있으면 중복)을 적용한다.
- **재전송이 실패해도 이 값은 지우지 않는다.** 외부몰 상품은 이전 값으로 살아있기 때문이다. 이때 `status`는 `failed`가 되는데, `status`는 "외부몰에 상품이 있는가"가 아니라 **"마지막 전송이 성공했는가"**를 뜻하기 때문이다.

설계 근거: `docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md`
```

- [ ] **Step 4: 커밋** — 사용자가 명시적으로 요청한 경우에만 실행한다

```bash
git add .claude/rules/domain-design.md docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md docs/superpowers/plans/2026-08-03-mall-linked-product-edit-resend.md
git commit -m "docs: 연동 데이터 수정·재전송 설계·계획 문서 및 도메인 규칙 추가"
```

---

## 완료 기준

- [ ] `npm run test` 166개 통과
- [ ] `npx tsc --noEmit` 에러 0건
- [ ] `npm run build` 성공
- [ ] Task 7 Step 2의 수동 확인 9개 항목 통과
- [ ] `.claude/rules/domain-design.md`에 저장·재전송 규칙이 반영됨
