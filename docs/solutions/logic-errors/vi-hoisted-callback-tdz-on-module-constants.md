---
title: vi.hoisted 콜백이 모듈 스코프 상수보다 먼저 실행돼 TDZ 에러가 난다
date: 2026-08-03
category: logic-errors
module: mocks
problem_type: logic-error
component: testing
severity: low
applies_when:
  - Vitest에서 `vi.hoisted`로 모킹용 데이터를 준비할 때
  - `vi.mock` 팩토리에 넘길 배열·객체를 테스트 파일 상단에서 만들 때
  - 기존 테스트 파일의 모킹 구조를 새 테스트로 복사할 때
symptoms:
  - "Cannot access 'X' before initialization" ReferenceError로 테스트 파일이 통째로 로드되지 않는다
  - TDD의 RED 단계에서 기대한 "모듈을 찾을 수 없음" 대신 엉뚱한 에러가 난다
  - 상수를 쓰지 않는 다른 테스트 파일에서는 같은 구조가 잘 동작한다
tags:
  - vitest
  - vi-hoisted
  - tdz
  - mocking
  - test-setup
---

# vi.hoisted 콜백이 모듈 스코프 상수보다 먼저 실행돼 TDZ 에러가 난다

## Context

MSW mock 유틸의 테스트를 쓸 때 이 코드베이스는 `vi.hoisted`로 mock 데이터 배열을 만들고 그것을 `vi.mock` 팩토리에 넘긴다. 데이터 모듈을 실제 시드 파일 대신 축소된 배열로 갈아끼우기 위해서다.

구현 계획서가 제공한 테스트 코드는 이런 모양이었다.

```ts
const OWNER_ID = 'usr_001';
const OTHER_OWNER_ID = 'usr_999';

const { LINKED, resetMocks } = vi.hoisted(() => {
  const makeLinked = (id: string, ownerId: string) => ({ id, ownerId /* ... */ });
  const LINKED = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks(); // ← 여기서 터진다

  return { LINKED, resetMocks };
});

vi.mock('../data/MockMallLinkedProductsData', () => ({ MOCK_MALL_LINKED_PRODUCT_DATA: LINKED }));
```

읽기에는 자연스럽다. 상수가 위에 선언돼 있고 아래에서 쓴다. 그런데 실행하면 테스트 파일이 아예 로드되지 않고 `ReferenceError: Cannot access 'OWNER_ID' before initialization`이 난다.

## Root Cause

**`vi.hoisted` 콜백은 이름 그대로 파일 최상단으로 끌어올려져 실행된다.** import보다도 먼저다 — 그래야 `vi.mock` 팩토리가 참조할 값을 미리 만들어 둘 수 있다.

문제는 `const` 선언이 함께 끌어올려지지 않는다는 것이다. `const`는 호이스팅되긴 하지만 초기화 전까지 접근할 수 없는 구간(Temporal Dead Zone)에 놓인다. 따라서 실행 순서는 이렇게 된다.

1. `vi.hoisted` 콜백 실행 → 내부에서 `resetMocks()` 호출 → `OWNER_ID` 접근
2. `OWNER_ID`는 아직 TDZ → **ReferenceError**
3. (도달하지 못함) `const OWNER_ID = 'usr_001'` 초기화

**콜백 안에서 바깥 상수를 참조하는 것 자체는 문제가 아니다.** 클로저는 정의 시점이 아니라 호출 시점에 값을 읽기 때문이다. 터지는 건 **콜백 안에서 그 클로저를 즉시 호출할 때**다. 위 코드의 `resetMocks()` 한 줄이 그것이다.

이 차이 때문에 증상이 헷갈린다 — 같은 구조라도 콜백 안에서 즉시 호출하지 않는 파일은 멀쩡히 동작한다.

## Solution

콜백이 쓰는 상수는 **콜백 안에서 선언하고, 바깥에서도 필요한 것만 반환받는다.**

```ts
const { LINKED, resetMocks, OWNER_ID } = vi.hoisted(() => {
  const OWNER_ID = 'usr_001';
  const OTHER_OWNER_ID = 'usr_999'; // 콜백 안에서만 쓰므로 반환하지 않는다

  const makeLinked = (id: string, ownerId: string) => ({ id, ownerId /* ... */ });
  const LINKED = [];

  const resetMocks = () => {
    LINKED.length = 0;
    LINKED.push(makeLinked('mlp_001', OWNER_ID), makeLinked('mlp_002', OTHER_OWNER_ID));
  };

  resetMocks();

  return { LINKED, resetMocks, OWNER_ID };
});
```

**바깥에서 안 쓰는 값은 반환하지 마라.** 위 예시의 `OTHER_OWNER_ID`를 같이 반환하면 미사용 변수 린트 에러가 난다.

콜백 안에서 즉시 호출할 일이 없다면 그 호출을 빼는 것만으로도 해결된다(`beforeEach`가 어차피 `resetMocks()`를 부른다). 다만 이 코드베이스는 위 형태로 통일해 뒀다 — 나중에 즉시 호출을 추가해도 안 터지기 때문이다.

## Why This Matters

- **TDD의 RED 단계를 오염시킨다.** "구현이 없어서 실패"를 기대했는데 "테스트 파일이 로드조차 안 됨"이 나온다. 실패 이유를 확인하지 않고 넘어가면 원인을 엉뚱한 곳에서 찾게 된다.
- **AI가 작성한 계획서 코드에 특히 잘 섞인다.** 상수를 위에 모아 선언하는 게 읽기 좋은 형태라 자연스럽게 그렇게 쓰이는데, `vi.hoisted`가 그 직관을 깬다.
- 같은 라운드에서 이 버그가 **두 테스트 파일에 연달아 나왔다.** 한 파일에서 발견한 뒤 나머지 계획서 코드를 미리 훑어 고쳤다.

## Related

- `src/mocks/utils/getMallLinkedProduct.test.ts`, `src/mocks/utils/updateMallLinkedProduct.test.ts` — 이 패턴을 적용한 테스트
- `src/mocks/utils/createMallLinkedProducts.test.ts` — 콜백 안에서 바깥 상수를 참조하지 않아 문제가 없었던 기존 파일
- `docs/solutions/logic-errors/generated-id-uniqueness-in-plan-code.md` — 같은 유형(계획서가 제공한 코드의 결함)의 다른 사례
