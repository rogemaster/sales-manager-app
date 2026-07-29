---
title: 고정값 난수 스텁은 "값이 바뀌지 않는가"를 검증하는 테스트를 공허하게 통과시킨다
date: 2026-07-29
category: conventions
module: project-wide
problem_type: test-design
component: testing
severity: medium
applies_when:
  - `vi.spyOn(Math, 'random').mockReturnValue(...)`처럼 난수를 고정해 결정론을 확보하는 테스트를 쓸 때
  - 난수로 생성된 값(ID, 토큰 등)이 재호출 시 보존되는지 검증하려 할 때
tags:
  - vitest
  - testing
  - mock
  - vacuous-test
  - determinism
---

# 고정값 난수 스텁은 "값이 바뀌지 않는가"를 검증하는 테스트를 공허하게 통과시킨다

## Context

몰 등록 전송 시뮬레이션에서 성공 시 `externalId`(외부몰이 부여한 상품 ID)를 `Math.random()` 기반으로 생성한다. 테스트는 결정론을 위해 난수를 고정했다.

```ts
const stubRandom = (value: number) => vi.spyOn(Math, 'random').mockReturnValue(value);
```

이 상태에서 아래 테스트가 통과하고 있었다.

```ts
it('실패한 조합을 재전송해 성공하면 errorMessage를 지우고 externalId를 채운다', () => {
  stubRandom(0.05);   // 실패
  registerMockProductsToMalls([item]);

  vi.restoreAllMocks();
  stubRandom(0.9);    // 성공
  registerMockProductsToMalls([item]);

  expect(...externalId).toMatch(/^ext_NSST_/);
});
```

그런데 구현에는 실제 버그가 있었다 — 성공할 때마다 `externalId`를 **무조건 재발급**하고 있었다(`existing.externalId = createExternalId(...)`). 이미 성공한 조합을 다시 전송하면 외부 ID가 매번 바뀐다. 도메인상 재전송은 신규 등록이 아니라 수정이므로 ID는 유지돼야 한다.

**기존 테스트는 이 버그를 잡을 수 없었다.** 최종 코드 리뷰에서야 발견됐다.

## Root Cause

`mockReturnValue`는 **모든 호출에 같은 값**을 돌려준다. `createExternalId`가 `Math.random().toString(36).slice(2, 8)`로 만들어지므로, 같은 난수 → **항상 같은 문자열**이다.

따라서 "재발급했는지"와 "보존했는지"가 **관측상 구분되지 않는다.** 두 경우 모두 같은 ID가 나오므로 어떤 등가 단언도 양쪽에서 통과한다. 테스트는 무언가를 검증하는 것처럼 보이지만 실제로는 아무것도 배제하지 못한다.

## Guidance

**"값이 보존되는가"를 검증하려면, 재실행 시 생성 로직이 반드시 다른 값을 내도록 만들어야 한다.** 두 번째 호출에 다른 난수를 스텁한다.

```ts
it('이미 성공한 조합을 다시 전송해도 externalId는 새로 발급하지 않는다', () => {
  stubRandom(0.9);
  registerMockProductsToMalls([item]);
  const firstExternalId = PRODUCTS[0].registeredMalls?.[0].externalId;

  vi.restoreAllMocks();
  // 두 번째 전송은 다른 난수를 쓴다 — 재발급이 일어나면 다른 id가 나와 실패한다
  stubRandom(0.95);
  registerMockProductsToMalls([item]);

  expect(PRODUCTS[0].registeredMalls?.[0].externalId).toBe(firstExternalId);
});
```

두 값(0.9 / 0.95)은 **같은 분기로 가되(둘 다 실패율 0.1 이상 = 성공) 생성 결과만 다르도록** 골라야 한다. 분기가 갈리면 다른 것을 검증하는 테스트가 된다.

**작성한 테스트가 실제로 버그를 배제하는지 확인하는 방법은 하나뿐이다 — 수정 전 코드에서 실패하는 것을 직접 본다.** TDD의 RED 단계가 형식이 아니라 이 이유로 존재한다.

## Why This Matters

- 공허한 테스트는 없는 것보다 나쁘다. 커버리지가 있으니 검증됐다고 착각하게 만든다.
- 이 버그는 mock 데이터에만 영향을 주는 것처럼 보이지만, 후속 화면이 이 mock을 기준으로 개발되면 "재전송해도 외부 ID는 유지된다"는 잘못된 전제를 학습하게 된다.
- 난수 고정은 결정론을 얻는 대신 **값의 다양성을 잃는다.** 그 다양성이 검증 대상인 경우에는 스텁 전략 자체를 바꿔야 한다.

## When to Apply

- 난수·타임스탬프 등 비결정 요소로 생성된 값의 **보존/불변**을 검증할 때
- `mockReturnValue`로 고정한 상태에서 등가 단언(`toBe`, `toEqual`)을 쓸 때 — "이 단언이 반대 구현에서도 통과하지 않는가"를 자문한다

## Related

- `[[msw-response-shape-not-type-checked-against-frontend]]` — 같은 작업에서 함께 드러난, 검증이 비어 있던 또 다른 지점
- `[[registered-malls-history-vs-current-state]]` — 이 버그가 위배한 설계 결정
