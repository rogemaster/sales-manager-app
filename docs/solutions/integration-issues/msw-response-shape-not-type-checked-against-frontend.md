---
title: MSW 핸들러 응답 형태와 프론트 선언 타입은 컴파일러가 대조해주지 않는다
date: 2026-07-29
category: integration-issues
module: project-wide
problem_type: silent-runtime-bug
component: api_layer
severity: high
applies_when:
  - MSW 핸들러가 반환하는 응답 body의 형태(필드명·구조)를 변경할 때
  - `features/*/api/`의 fetch 래퍼가 선언한 Response 인터페이스를 수정할 때
  - mock 응답을 소비하는 컴포넌트에서 값이 `undefined`로 렌더링될 때
tags:
  - msw
  - typescript
  - type-safety
  - fetch
  - runtime-bug
  - mock
---

# MSW 핸들러 응답 형태와 프론트 선언 타입은 컴파일러가 대조해주지 않는다

## Context

몰 등록 전송 API를 `{ success, count }`에서 집계 결과 `{ totalCount, successCount, failCount }`로 바꾸는 작업 중 발생했다.

MSW 핸들러와 `src/mocks/utils/`의 로직은 새 형태를 반환하도록 고쳤지만, 프론트의 fetch 래퍼(`src/features/mallRegistration/api/registerProductsToMalls.ts`)는 여전히 옛 인터페이스를 선언하고 있었고, 소비 측 UI는 `data.count`를 읽고 있었다.

**`npm run build`와 `npx tsc --noEmit`이 모두 통과했다.** 구현 계획은 이 시점에 타입 에러가 날 것으로 예상했는데, 실제로는 아무 에러도 나지 않았다.

## Root Cause

이 프로젝트의 fetch 래퍼는 전부 이 형태다:

```ts
export interface RegisterProductsToMallsResponse { /* ... */ }

export const registerProductsToMalls = async (...): Promise<RegisterProductsToMallsResponse> => {
  const response = await fetch(...);
  if (!response.ok) throw new Error('쇼핑몰 등록 전송 실패');
  return response.json();   // ← Promise<any>
};
```

`response.json()`의 반환 타입은 `Promise<any>`다. TypeScript는 `any`를 선언된 반환 타입에 그대로 통과시키므로, **함수가 선언한 타입이 검증 없이 사실로 받아들여진다.** 핸들러가 실제로 무엇을 반환하든 대조되지 않는다.

결과적으로 `data.count`는 타입 체크를 통과하고 런타임에 `undefined`가 된다. UI에는 `"undefined건이 쇼핑몰로 전송되었습니다."`가 뜬다. 테스트도 잡지 못한다 — 이 프로젝트의 테스트 범위는 `src/mocks/utils/`(순수 로직)뿐이라 mock↔프론트 경계를 지나지 않는다.

## Guidance

**mock과 프론트가 같은 타입을 공유하게 만들어 컴파일 타임 결합을 복원한다.** 응답 타입은 프론트(`features/*/api/`)에 한 벌만 선언하고, `src/mocks/`가 그것을 `import type`으로 가져다 쓴다.

```ts
// src/mocks/utils/registerProductsToMalls.ts
import type { RegisterProductsToMallsResponse } from '@/features/mallRegistration/api/registerProductsToMalls';

export const registerMockProductsToMalls = (items): RegisterProductsToMallsResponse => { /* ... */ };
```

`import type`이므로 런타임 의존성이 생기지 않고 순환 참조도 없다. 이 방향(`mocks/` → `features/`)은 이미 이 파일이 `MallRegistration`을 `@/features/products/types`에서 가져오던 것과 같다.

이렇게 하면 한쪽 필드명을 바꾸는 순간 반대쪽에서 컴파일 에러가 난다.

## Why This Matters

- **빌드 통과는 mock API 계약의 정합성을 전혀 보증하지 않는다.** "타입 체크 통과했으니 맞다"는 판단이 이 경계에서는 성립하지 않는다.
- 이 갭은 조용하다. 에러가 나지 않고, 화면에 `undefined`가 찍힐 뿐이라 수동 확인을 건너뛰면 그대로 병합된다.
- 실제 백엔드로 교체할 때도 같은 함정이 남는다 — 백엔드 응답 필드명이 다르면 역시 아무도 안 잡는다.

## When to Apply

- MSW 핸들러의 응답 body 형태를 바꿀 때 — 반드시 소비 측 타입과 사용처를 함께 확인한다
- 새 mock API를 추가할 때 — 처음부터 응답 타입을 한 벌만 두고 양쪽이 공유하게 한다
- 화면에 `undefined`가 렌더링되는데 타입 에러가 없을 때 — 이 경계를 먼저 의심한다

## Related

- `[[msw-domain-split-handlers]]` — MSW 핸들러 구조 규칙
- `[[stale-ide-diagnostics-verify-with-tsc]]` — 반대 방향의 함정(진단이 있는데 실제로는 문제없음). 이 문서는 진단이 없는데 실제로는 문제가 있는 경우다
- `[[registered-malls-history-vs-current-state]]` — 이 버그가 드러난 작업
