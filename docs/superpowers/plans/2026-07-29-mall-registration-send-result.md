# 몰 등록 전송 결과 영속화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 몰 등록 전송 시 외부 쇼핑몰 API 실패를 시뮬레이션하고, 성공·실패 결과를 `Product.registeredMalls`에 조합 단위 upsert로 영속화한다.

**Architecture:** `Product.registeredMalls`를 append 이력에서 `mallCode + shoppingSettingId` 조합 단위 upsert(현재 상태)로 전환한다. MSW 유틸(`src/mocks/utils/registerProductsToMalls.ts`)이 "백엔드 → 외부 몰 API 호출 + 결과 집계"를 시뮬레이션하고, 핸들러는 위임만 한다. 프론트는 집계 카운트만 소비해 알림 문구에 반영하고, 실패 상세 UI는 만들지 않는다(다음 라운드 "쇼핑몰 등록 상품 목록" 화면 담당).

**Tech Stack:** TypeScript(strict), MSW, Vitest, Jotai, TanStack Query

**선행 스펙:** `docs/superpowers/specs/2026-07-29-mall-registration-send-result-design.md`

## Global Constraints

- **git 작업 금지:** 이 계획에는 커밋 스텝이 없다. `git add`/`git commit`/브랜치 생성 등 모든 git 작업은 사용자가 명시적으로 요청할 때만 실행한다 (CLAUDE.md Git/PR 규칙). Task 완료 후 자동 커밋하지 않는다.
- **`src/app/api/**/route.ts` 생성 금지.** 이 기능의 API는 MSW 핸들러로만 처리한다 (`.claude/rules/msw-rules.md`).
- **MSW 핸들러는 위임만 한다.** 조건문·반복문·데이터 조작은 `src/mocks/utils/`에 둔다.
- **실패율:** `Math.random() < 0.1` → 실패 (항목별 독립 판정).
- **`delay`:** 몰 등록 전송 핸들러는 `800`.
- **오류 메시지 상수 위치:** `src/mocks/utils/registerProductsToMalls.ts` **파일 내부**. 백엔드 연동 시 파일째 삭제될 시뮬레이션 전용 코드라 `constant/`로 분리하지 않는다.
- **테스트 범위 관례:** 테스트는 `src/mocks/utils/`(순수 로직)에만 작성한다. UI 컴포넌트·API fetch 래퍼에는 테스트 파일을 만들지 않는다 (CLAUDE.md).
- **Prettier:** `printWidth: 120`, `singleQuote: true`, `trailingComma: all`, `semi: true`.

## File Structure

| 파일 | 책임 | Task |
|------|------|------|
| `src/features/products/types/product.types.ts` | `MallRegistration` 도메인 타입 — 상태/외부ID/오류사유 보유 | 1 |
| `src/mocks/utils/registerProductsToMalls.ts` | 전송 시뮬레이션 전체 — upsert 시맨틱, 실패 판정, 오류 메시지, 집계 | 1, 2 |
| `src/mocks/utils/registerProductsToMalls.test.ts` | 위 유틸의 단위 테스트 | 1, 2 |
| `src/mocks/handlers/products.ts` | 라우트 배선 — 소유권 검증 후 유틸 위임, 응답 반환 | 2 |
| `src/features/mallRegistration/api/registerProductsToMalls.ts` | 전송 API fetch 래퍼 + 응답 타입 | 3 |
| `src/features/mallRegistration/ui/MallRegistrationActionSection.tsx` | 전송 액션 — 결과 카운트를 알림 문구로 변환 | 3 |

---

## Task 1: `MallRegistration` 타입 확장 + upsert 시맨틱 전환

전송 결과를 담을 필드를 타입에 추가하고, 저장 방식을 append 이력에서 조합 단위 upsert로 바꾼다. 이 Task에서는 **실패를 아직 도입하지 않는다** — 모든 항목이 `status: 'success'`로 기록되고, 함수 반환 타입도 기존 `number`를 유지해 핸들러가 깨지지 않게 한다. 실패 시뮬레이션과 집계는 Task 2가 담당한다.

**Files:**
- Modify: `src/features/products/types/product.types.ts:6-11`
- Modify: `src/mocks/utils/registerProductsToMalls.ts` (전체 교체)
- Test: `src/mocks/utils/registerProductsToMalls.test.ts` (기존 테스트 2번 반전 + 단언 보강)

**Interfaces:**
- Consumes: `MallRegistrationRequestItem`(`src/features/mallRegistration/types/mallRegistration.types.ts`) — `{ productId: string; mallCode: ShoppingMalls; shoppingSettingId: string }`. 변경 없음.
- Produces:
  - `export type MallRegistrationStatus = 'success' | 'failed'`
  - `MallRegistration` = `{ id: string; mallCode: ShoppingMalls; shoppingSettingId: string; status: MallRegistrationStatus; registeredAt: string; externalId?: string; errorMessage?: string }`
  - `registerMockProductsToMalls(items: MallRegistrationRequestItem[]): number` — 시그니처 유지 (Task 2에서 반환 타입 변경)

---

- [ ] **Step 1: 타입 확장**

`src/features/products/types/product.types.ts`의 6~11번 줄 `MallRegistration`을 아래로 교체한다. 파일 상단에 `ShoppingMalls`는 이미 import되어 있다.

```ts
export type MallRegistrationStatus = 'success' | 'failed';

export interface MallRegistration {
  id: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  status: MallRegistrationStatus;
  registeredAt: string; // 마지막 전송 시각
  externalId?: string; // 성공 시 외부몰이 부여한 상품 ID
  errorMessage?: string; // 실패 시 사유
}
```

`Product.registeredMalls?: MallRegistration[]`(37번 줄)은 변경하지 않는다.

- [ ] **Step 2: 실패 테스트 작성**

`src/mocks/utils/registerProductsToMalls.test.ts`를 아래 내용으로 **전체 교체**한다. 기존 2번 테스트("각각 별도 이력으로 누적된다")가 upsert 동작으로 반전되는 것이 핵심 변경이다.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '@/features/products/types/product.types';

const { PRODUCTS, resetProducts } = vi.hoisted(() => {
  const makeProduct = (overrides: Partial<Product>): Product =>
    ({
      productId: 'p_001',
      name: '상품A',
      categoryId: 'c00001',
      price: 10000,
      state: 'ON_SALE',
      deliveryType: 'FREE',
      deliveryPrice: 0,
      mainImage: '',
      detailPage: '',
      totalQuantity: 10,
      createDate: new Date('2025-01-01'),
      updateDate: new Date('2025-01-01'),
      informationDisclosure: { key: '', id: '', name: '', fields: {} },
      ownerId: 'usr_001',
      ...overrides,
    }) as Product;

  const PRODUCTS: Product[] = [];

  const resetProducts = () => {
    PRODUCTS.length = 0;
    PRODUCTS.push(makeProduct({ productId: 'p_001' }), makeProduct({ productId: 'p_002' }));
  };

  resetProducts();

  return { PRODUCTS, resetProducts };
});

vi.mock('../data/MockProductsData', () => ({ MOCK_PRODUCT_DATA: PRODUCTS }));

import { registerMockProductsToMalls } from './registerProductsToMalls';

describe('registerMockProductsToMalls', () => {
  beforeEach(() => {
    resetProducts();
  });

  it('해당 상품의 registeredMalls에 성공 상태로 항목을 추가하고 처리 건수를 반환한다', () => {
    const count = registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_003' }]);

    expect(count).toBe(1);
    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({
      mallCode: 'NSST',
      shoppingSettingId: 'ss_003',
      status: 'success',
    });
  });

  it('같은 몰-설정 조합을 다시 전송하면 이력이 쌓이지 않고 기존 항목이 갱신된다', () => {
    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);
    const firstId = PRODUCTS[1].registeredMalls?.[0].id;

    registerMockProductsToMalls([{ productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[1].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[1].registeredMalls?.[0].id).toBe(firstId);
  });

  it('같은 상품이라도 몰-설정 조합이 다르면 별도 항목으로 추가된다', () => {
    registerMockProductsToMalls([
      { productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_001' },
      { productId: 'p_002', mallCode: 'COUP', shoppingSettingId: 'ss_002' },
      { productId: 'p_002', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
    ]);

    expect(PRODUCTS[1].registeredMalls).toHaveLength(3);
  });

  it('존재하지 않는 productId는 건너뛰고 건수에 포함하지 않는다', () => {
    const count = registerMockProductsToMalls([{ productId: 'nope', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);

    expect(count).toBe(0);
  });
});
```

**`resetProducts`를 추가한 이유:** 기존 테스트는 모듈 스코프 배열을 테스트 간에 공유해 실행 순서에 의존했다. upsert로 바뀌면 "이미 그 조합이 있는가"가 결과를 좌우하므로, 각 테스트가 깨끗한 상태에서 시작해야 한다.

- [ ] **Step 3: 실패 확인**

Run: `npm run test -- registerProductsToMalls`

Expected: FAIL. `status: 'success'` 단언과 upsert 단언이 깨진다 —
- `toMatchObject` 실패: 실제 객체에 `status` 키 없음
- `expect(PRODUCTS[1].registeredMalls).toHaveLength(1)` 실패: `2`를 받음 (현재는 append)

- [ ] **Step 4: 최소 구현**

`src/mocks/utils/registerProductsToMalls.ts`를 아래로 **전체 교체**한다.

```ts
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';
import { MallRegistration } from '@/features/products/types/product.types';

// mallCode + shoppingSettingId 조합 단위로 upsert한다.
// 재전송은 새 이력이 아니라 기존 등록 건의 상태 갱신이므로 조합당 항상 1건만 유지한다.
const upsertRegistration = (
  registrations: MallRegistration[],
  item: MallRegistrationRequestItem,
  index: number,
  now: string,
) => {
  const existing = registrations.find(
    (r) => r.mallCode === item.mallCode && r.shoppingSettingId === item.shoppingSettingId,
  );

  if (!existing) {
    registrations.push({
      id: `mr_${Date.now()}_${index}`,
      mallCode: item.mallCode,
      shoppingSettingId: item.shoppingSettingId,
      status: 'success',
      registeredAt: now,
    });
    return;
  }

  // id는 기존 값을 유지한다 — 후속 화면에서 행 key로 쓸 안정적인 식별자가 필요하다.
  existing.status = 'success';
  existing.registeredAt = now;
};

export const registerMockProductsToMalls = (items: MallRegistrationRequestItem[]): number => {
  const now = new Date().toISOString();
  let count = 0;

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    if (!product) return;
    if (!product.registeredMalls) product.registeredMalls = [];

    upsertRegistration(product.registeredMalls, item, index, now);
    count += 1;
  });

  return count;
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm run test -- registerProductsToMalls`

Expected: PASS (4 tests)

- [ ] **Step 6: 타입 회귀 확인**

Run: `npm run build`

Expected: 성공. `MallRegistration`에 필수 필드 `status`가 추가됐으므로, 이 타입의 객체를 리터럴로 만드는 다른 코드가 있으면 여기서 에러가 난다. 에러가 나면 해당 위치에 `status`를 채운다 (현재 코드베이스에서 `MallRegistration` 객체를 생성하는 곳은 `registerProductsToMalls.ts` 한 곳뿐이라 통과할 것으로 예상).

---

## Task 2: 실패 시뮬레이션 + 집계 반환 + 핸들러 갱신

외부 몰 API 실패를 확률적으로 발생시키고, 성공·실패 양쪽을 `registeredMalls`에 반영한다. 반환 타입을 집계 결과로 바꾸므로 핸들러도 같은 Task에서 함께 갱신해야 컴파일이 유지된다.

**Files:**
- Modify: `src/mocks/utils/registerProductsToMalls.ts` (Task 1 결과물 위에 확장)
- Modify: `src/mocks/utils/registerProductsToMalls.test.ts` (테스트 추가 + 기존 반환값 단언 수정)
- Modify: `src/mocks/handlers/products.ts:54-67` (`mall-registration` 라우트)

**Interfaces:**
- Consumes: Task 1의 `MallRegistration`(`status`/`externalId`/`errorMessage` 포함), `upsertRegistration` 내부 헬퍼
- Produces:
  - `export interface MallRegistrationResult { totalCount: number; successCount: number; failCount: number }`
  - `registerMockProductsToMalls(items: MallRegistrationRequestItem[]): MallRegistrationResult` — **반환 타입 변경** (`number` → `MallRegistrationResult`)
  - `POST /api/products/mall-registration` 응답 body = `MallRegistrationResult` (기존 `{ success, count }` 대체)

---

- [ ] **Step 1: 실패 테스트 작성**

`src/mocks/utils/registerProductsToMalls.test.ts`에 다음을 반영한다.

**(a)** 상단 import에 `afterEach`를 추가한다.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

**(b)** `beforeEach` 아래에 랜덤 스텁 헬퍼와 정리 훅을 추가한다.

```ts
  // 성공/실패는 Math.random()으로 판정한다. 성공 경로는 externalId 생성에도 난수를 쓰므로
  // mockReturnValueOnce 체인을 쓰면 호출 횟수에 따라 결과가 어긋난다. 항상 mockReturnValue로 고정한다.
  const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);

  afterEach(() => {
    vi.restoreAllMocks();
  });
```

**(c)** 기존 4개 테스트에서 반환값을 쓰는 부분을 집계 객체 기준으로 고친다. 실패율이 개입하지 않도록 각 테스트 첫 줄에 `stubRandom(0.9)`(항상 성공)를 넣는다.

```ts
  it('해당 상품의 registeredMalls에 성공 상태로 항목을 추가하고 처리 건수를 반환한다', () => {
    stubRandom(0.9);

    const result = registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_003' }]);

    expect(result).toEqual({ totalCount: 1, successCount: 1, failCount: 0 });
    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({
      mallCode: 'NSST',
      shoppingSettingId: 'ss_003',
      status: 'success',
    });
  });
```

`같은 몰-설정 조합을 다시 전송하면...`, `같은 상품이라도 몰-설정 조합이 다르면...` 두 테스트는 첫 줄에 `stubRandom(0.9);`만 추가한다.

`존재하지 않는 productId는...` 테스트는 단언을 바꾼다.

```ts
  it('존재하지 않는 productId는 건너뛰고 건수에 포함하지 않는다', () => {
    stubRandom(0.9);

    const result = registerMockProductsToMalls([{ productId: 'nope', mallCode: 'COUP', shoppingSettingId: 'ss_001' }]);

    expect(result).toEqual({ totalCount: 0, successCount: 0, failCount: 0 });
  });
```

**(d)** 실패 동작 테스트 4개를 `describe` 블록 끝에 추가한다.

```ts
  it('실패 판정 시 status와 몰별 오류 메시지를 기록하고 failCount로 집계한다', () => {
    stubRandom(0.05);

    const result = registerMockProductsToMalls([
      { productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' },
      { productId: 'p_001', mallCode: 'KAKAOS', shoppingSettingId: 'ss_002' },
      { productId: 'p_001', mallCode: 'COUP', shoppingSettingId: 'ss_003' },
    ]);

    expect(result).toEqual({ totalCount: 3, successCount: 0, failCount: 3 });
    expect(PRODUCTS[0].registeredMalls?.[0]).toMatchObject({ status: 'failed', errorMessage: '카테고리 매핑 오류' });
    expect(PRODUCTS[0].registeredMalls?.[1]).toMatchObject({ status: 'failed', errorMessage: '상품명 글자 수 초과' });
    // 전용 메시지가 없는 몰은 공통 fallback을 쓴다
    expect(PRODUCTS[0].registeredMalls?.[2].errorMessage).toBe('외부 쇼핑몰 전송 실패');
  });

  it('성공 시 externalId를 부여한다', () => {
    stubRandom(0.9);

    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toMatch(/^ext_NSST_/);
  });

  it('실패한 조합을 재전송해 성공하면 errorMessage를 지우고 externalId를 채운다', () => {
    stubRandom(0.05);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBeDefined();

    vi.restoreAllMocks();
    stubRandom(0.9);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls).toHaveLength(1);
    expect(PRODUCTS[0].registeredMalls?.[0].status).toBe('success');
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBeUndefined();
    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toMatch(/^ext_NSST_/);
  });

  it('성공한 조합이 재전송에서 실패해도 externalId는 보존한다', () => {
    stubRandom(0.9);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);
    const externalId = PRODUCTS[0].registeredMalls?.[0].externalId;

    vi.restoreAllMocks();
    stubRandom(0.05);
    registerMockProductsToMalls([{ productId: 'p_001', mallCode: 'NSST', shoppingSettingId: 'ss_001' }]);

    expect(PRODUCTS[0].registeredMalls?.[0].status).toBe('failed');
    expect(PRODUCTS[0].registeredMalls?.[0].errorMessage).toBe('카테고리 매핑 오류');
    // 외부몰에 이미 올라간 상품의 수정 전송이 실패한 것이므로 외부 ID 자체는 여전히 유효하다
    expect(PRODUCTS[0].registeredMalls?.[0].externalId).toBe(externalId);
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test -- registerProductsToMalls`

Expected: FAIL. 대표적으로 —
- `expect(result).toEqual({ totalCount: 1, ... })` 실패: 실제 반환값은 숫자 `1`
- `errorMessage`/`externalId` 단언 실패: `undefined`

- [ ] **Step 3: 최소 구현 — 유틸**

`src/mocks/utils/registerProductsToMalls.ts`를 아래로 **전체 교체**한다.

```ts
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { MallRegistrationRequestItem } from '@/features/mallRegistration/types/mallRegistration.types';
import { MallRegistration } from '@/features/products/types/product.types';
import { ShoppingMalls } from '@/types/common.type';

export interface MallRegistrationResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}

// --- 외부 몰 API 시뮬레이션 전용 상수 ---
// 실제 백엔드 게이트웨이가 붙으면 이 파일과 함께 통째로 삭제된다. constant/로 분리하지 않는 이유다.
const FAILURE_RATE = 0.1;
const FALLBACK_ERROR_MESSAGE = '외부 쇼핑몰 전송 실패';
const MALL_ERROR_MESSAGES: Partial<Record<ShoppingMalls, string>> = {
  NSST: '카테고리 매핑 오류',
  KAKAOS: '상품명 글자 수 초과',
};

const createExternalId = (mallCode: ShoppingMalls) => `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}`;

// mallCode + shoppingSettingId 조합 단위로 upsert한다.
// 재전송은 새 이력이 아니라 기존 등록 건의 상태 갱신이므로 조합당 항상 1건만 유지한다.
const upsertRegistration = (
  registrations: MallRegistration[],
  item: MallRegistrationRequestItem,
  index: number,
  now: string,
  isSuccess: boolean,
) => {
  const errorMessage = MALL_ERROR_MESSAGES[item.mallCode] ?? FALLBACK_ERROR_MESSAGE;
  const existing = registrations.find(
    (r) => r.mallCode === item.mallCode && r.shoppingSettingId === item.shoppingSettingId,
  );

  if (!existing) {
    registrations.push({
      id: `mr_${Date.now()}_${index}`,
      mallCode: item.mallCode,
      shoppingSettingId: item.shoppingSettingId,
      status: isSuccess ? 'success' : 'failed',
      registeredAt: now,
      ...(isSuccess ? { externalId: createExternalId(item.mallCode) } : { errorMessage }),
    });
    return;
  }

  // id는 기존 값을 유지한다 — 후속 화면에서 행 key로 쓸 안정적인 식별자가 필요하다.
  existing.status = isSuccess ? 'success' : 'failed';
  existing.registeredAt = now;

  if (isSuccess) {
    existing.externalId = createExternalId(item.mallCode);
    // 성공했으므로 이전 실패 사유를 남겨두면 안 된다.
    delete existing.errorMessage;
  } else {
    existing.errorMessage = errorMessage;
    // externalId는 지우지 않는다 — 이미 외부몰에 올라간 상품의 수정 전송 실패일 수 있다.
  }
};

export const registerMockProductsToMalls = (items: MallRegistrationRequestItem[]): MallRegistrationResult => {
  const now = new Date().toISOString();
  const result: MallRegistrationResult = { totalCount: 0, successCount: 0, failCount: 0 };

  items.forEach((item, index) => {
    const product = MOCK_PRODUCT_DATA.find((p) => p.productId === item.productId);
    if (!product) return;
    if (!product.registeredMalls) product.registeredMalls = [];

    const isSuccess = Math.random() >= FAILURE_RATE;
    upsertRegistration(product.registeredMalls, item, index, now, isSuccess);

    result.totalCount += 1;
    if (isSuccess) result.successCount += 1;
    else result.failCount += 1;
  });

  return result;
};
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test -- registerProductsToMalls`

Expected: PASS (8 tests)

- [ ] **Step 5: 핸들러 갱신**

`src/mocks/handlers/products.ts`의 `mall-registration` 라우트(54~67번 줄)에서 `delay`를 800으로 올리고 응답을 집계 결과로 바꾼다. 소유권 검증(403) 로직은 그대로 둔다.

```ts
  http.post(`${baseUrl}/api/products/mall-registration`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, items } = (await request.json()) as { ownerId: string; items: MallRegistrationRequestItem[] };
    const productIds = [...new Set(items.map((item) => item.productId))];
    const allOwned = productIds.every((id) => {
      const product = MOCK_PRODUCT_DATA.find((p) => p.productId === id);
      return !!product && isOwnerMatch(product.ownerId, ownerId);
    });
    if (!allOwned) {
      return new HttpResponse(null, { status: 403 });
    }
    return HttpResponse.json(registerMockProductsToMalls(items));
  }),
```

- [ ] **Step 6: 전체 확인**

Run: `npm run test`

Expected: 전체 테스트 PASS

Run: `npm run build`

Expected: FAIL — `MallRegistrationActionSection.tsx`에서 `data.count`를 읽고 있는데 응답 타입이 바뀌었다. 이 에러는 **Task 3에서 해소한다.** 다른 위치에서 에러가 나면 그건 예상 밖이므로 원인을 확인한다.

---

## Task 3: 프론트 응답 타입 + 알림 문구

집계 결과를 프론트 타입에 반영하고, 전송 완료 알림에 성공·실패 건수를 표시한다. 실패 항목 목록 UI는 만들지 않는다.

**Files:**
- Modify: `src/features/mallRegistration/api/registerProductsToMalls.ts:3-6`
- Modify: `src/features/mallRegistration/ui/MallRegistrationActionSection.tsx:48-56`

**Interfaces:**
- Consumes: Task 2의 응답 body `{ totalCount, successCount, failCount }`
- Produces: `RegisterProductsToMallsResponse` = `{ totalCount: number; successCount: number; failCount: number }`. `useRegisterProductsToMalls`의 mutation 데이터 타입이 여기서 파생되므로 훅 파일은 수정 불필요.

**테스트 없음:** UI 컴포넌트와 API fetch 래퍼는 이 프로젝트의 테스트 범위 밖이다 (CLAUDE.md). 검증은 타입 체크(`npm run build`)와 개발 서버 수동 확인으로 한다.

---

- [ ] **Step 1: 응답 타입 교체**

`src/features/mallRegistration/api/registerProductsToMalls.ts`의 3~6번 줄을 교체한다. 나머지(fetch 호출, 에러 throw)는 변경하지 않는다.

```ts
export interface RegisterProductsToMallsResponse {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

- [ ] **Step 2: 알림 문구 반영**

`src/features/mallRegistration/ui/MallRegistrationActionSection.tsx`의 `registerToMalls(items, { ... })` 호출(48~56번 줄)에서 `onSuccess`만 교체한다. `onError`는 그대로 둔다.

```ts
    registerToMalls(items, {
      onSuccess: ({ totalCount, successCount, failCount }) => {
        // 결과와 무관하게 staging은 항상 비운다.
        // 실패 건은 registeredMalls에 남아 후속 "쇼핑몰 등록 상품 목록" 화면에서 수정·재전송한다.
        resetState();

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
        showAlert({ message: '전송 중 오류가 발생했습니다. 다시 시도해주세요.', type: 'error' });
      },
    });
```

- [ ] **Step 3: 타입 체크 통과 확인**

Run: `npm run build`

Expected: PASS. Task 2 Step 6에서 났던 `data.count` 에러가 사라진다.

- [ ] **Step 4: 린트 및 전체 테스트**

Run: `npm run lint`

Expected: 에러 없음

Run: `npm run test`

Expected: 전체 PASS

- [ ] **Step 5: 수동 동작 확인**

Run: `npm run dev` 후 `/shopping/register` 접속

확인 항목:
1. 상품 여러 건 체크 → `[쇼핑몰등록]` → 몰·설정 선택 → `완료` → 배지 표시
2. `[쇼핑몰 전송]` 클릭 → 약 0.8초 지연 후 알림 표시
3. 전송 건수를 10건 이상으로 만들면 실패가 섞여 `"총 N건 중 M건 전송 성공, K건 실패했습니다."`(주황 warning) 알림이 뜬다. 실패가 안 나오면 몇 번 더 시도한다 (건당 10% 확률)
4. 결과와 무관하게 배지가 모두 사라지고 체크박스가 해제된다

---

## 완료 후

- **커밋하지 않는다.** 모든 Task 완료 후 사용자에게 검토를 요청하고, 커밋·브랜치·PR은 사용자가 명시적으로 요청할 때만 진행한다.
- 현재 브랜치가 `main`이면 구현 전 `feat/mall-registration-send-result` 브랜치 생성이 필요하다는 점을 사용자에게 먼저 안내한다.
