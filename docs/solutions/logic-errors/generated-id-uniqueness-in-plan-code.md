---
title: 계획서가 제공한 id 생성 코드가 유일성을 보장하지 못했다
date: 2026-08-02
category: logic-errors
module: mocks
problem_type: logic-error
component: mock-data
severity: medium
applies_when:
  - `Date.now()`나 `Math.random()`으로 식별자를 생성할 때
  - AI가 작성한 구현 계획의 코드 블록을 그대로 옮겨 쓸 때
  - 테스트가 난수를 고정값으로 스텁하는 환경에서 id를 생성할 때
tags:
  - id-generation
  - uniqueness
  - planning
  - vitest
  - mock
---

# 계획서가 제공한 id 생성 코드가 유일성을 보장하지 못했다

## Context

구현 계획(`docs/superpowers/plans/2026-08-01-mall-linked-product-list.md`)이 연동 데이터 생성 유틸의 완성 코드를 제공했고, 그중 id 생성부는 이랬다.

```ts
items.forEach((item, index) => {
  // ...
  id: `mlp_${Date.now()}_${index}`,
  externalProductId: isSuccess ? `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}` : undefined,
});
```

같은 계획서가 요구한 테스트는 이랬다.

```ts
it('같은 조합을 다시 전송하면 별도 연동 데이터가 추가되고 외부 상품코드가 서로 다르다', () => {
  stubRandom(0.9);
  createMockMallLinkedProducts([item], OWNER_ID, EMAIL);
  createMockMallLinkedProducts([item], OWNER_ID, EMAIL);

  expect(LINKED[0].id).not.toBe(LINKED[1].id);
  expect(LINKED[0].externalProductId).not.toBe(LINKED[1].externalProductId);
});
```

**계획서의 코드로는 이 테스트가 통과할 수 없다.** 구현자가 코드를 옮기고 테스트를 돌리는 과정에서 발견했다.

## Root Cause

두 생성기가 각각 다른 이유로 겹친다.

**`id`:** `index`는 `forEach` 하나의 순회 안에서만 증가한다. 별도 호출 두 번은 각각 `index === 0`으로 시작하므로, 두 호출이 같은 밀리초에 일어나면 `mlp_<같은시각>_0`이 두 번 나온다. 테스트에서는 연속 호출이라 거의 항상 같은 밀리초다.

**`externalProductId`:** 테스트가 결정론을 위해 `vi.spyOn(Math, 'random').mockReturnValue(0.9)`로 고정한다. `Math.random().toString(36).slice(2, 8)`는 같은 입력에 항상 같은 문자열을 낸다. **난수가 유일성의 유일한 원천인데 테스트가 그 난수를 없앤다.**

계획을 쓸 때 "호출 하나 안에서의 유일성"만 생각했고, "호출 사이의 유일성"과 "테스트 환경에서의 유일성"을 따지지 않았다.

## Guidance

**호출 경계를 넘어 단조 증가하는 값을 섞는다.**

```ts
// 모듈 스코프 — 프로세스 내에서 유일함을 보장한다
let idSequence = 0;
const nextSequence = () => idSequence++;

const createLinkedProductId = (sequence: number) => `mlp_${Date.now()}_${sequence}`;
const createExternalProductId = (mallCode: ShoppingMalls, sequence: number) =>
  `ext_${mallCode}_${Math.random().toString(36).slice(2, 8)}${sequence}`;
```

`Date.now()`와 난수는 가독성·현실감을 위해 남기되, **유일성의 책임은 시퀀스가 진다.** 난수가 고정되든 시계가 멈추든 시퀀스는 증가한다.

**점검 질문 세 가지:**

1. 같은 밀리초에 두 번 호출되면 겹치는가?
2. 테스트가 난수를 고정하면 겹치는가?
3. 유일성의 원천이 하나뿐인가? (하나라면 그것을 무력화하는 환경이 있는지 확인)

## Why This Matters

- **AI가 생성한 계획서의 코드는 검증된 코드가 아니다.** 계획은 완성도 높은 코드 블록을 담고 있어 "옮겨 적기만 하면 되는" 것처럼 보이지만, 실행된 적 없는 코드다. 이 프로젝트에서 계획대로 구현하는 방식은 유효했지만, **계획 코드를 그대로 옮겨도 테스트는 반드시 돌려야 한다**는 전제 위에서만 그렇다.
- 이 사례에서 결함을 잡은 것은 **같은 계획서가 요구한 테스트**였다. 계획에 테스트를 먼저 쓰게 한 구조(TDD)가 계획 자신의 오류를 잡아냈다.
- mock 데이터의 id 충돌은 조용히 번진다 — 목록 화면의 React `key` 중복, 단건 조회 시 잘못된 레코드 매칭으로 이어지는데 어느 것도 컴파일 에러가 아니다.

## When to Apply

- 식별자를 시각·난수 기반으로 만드는 모든 코드 (mock이든 실제든)
- 구현 계획의 코드 블록을 옮길 때 — "이 코드가 계획서의 테스트를 통과하는가"를 실제로 확인
- 테스트가 비결정 요소를 고정하는 환경 — 고정이 무엇을 무력화하는지 함께 생각할 것

## Related

- `[[deterministic-random-stub-vacuous-test]]` — 같은 난수 고정이 만든 다른 함정(공허한 통과)
- `[[snapshot-copy-widens-ownership-validation-scope]]` — 같은 라운드에서 나온 계획서 유래 결함
