---
title: JSON.stringify가 undefined 값을 가진 키를 지워서 "필드 비우기"가 조용히 무동작이 된다
date: 2026-08-27
category: logic-errors
module: features/mallLinkedProduct, mocks/utils
problem_type: silent_no_op
component: api_payload
severity: high
applies_when:
  - 부분 수정(PATCH) API에 "이 필드를 비운다"는 의사를 담아 보내야 할 때
  - 서버가 `{ ...기존, ...patch }` 형태로 얕은 병합을 할 때
  - 폼 값에서 "비어 있음"이 빈 문자열이 아니라 undefined로 나타나는 필드가 섞여 있을 때
tags:
  - json
  - undefined
  - patch
  - shallow-merge
  - react-hook-form
  - bulk-edit
  - false-success
---

# JSON.stringify가 undefined 값을 가진 키를 지워서 "필드 비우기"가 조용히 무동작이 된다

## 증상

연동 상품 일괄수정 화면에서 **부가세유형만 체크하고 아무것도 고르지 않은 채 '수정'을 누르면, 아무 값도 바뀌지 않는데 "N건이 수정되었습니다"라는 성공 알림이 뜬다.**

에러도, 경고도, 실패 카운트도 없다. 사용자는 수정이 된 줄 알고 화면을 떠난다.

## 원인

세 층이 각자 정상 동작하는데 이어붙이면 값이 사라진다.

**1층 — 폼**: "비어 있음"의 표현이 필드마다 다르다.

| 필드 | 등록 방식 | 비었을 때 값 |
|------|----------|-------------|
| `customerCode`, `modelName`, `detailPage` | `register()` 텍스트 입력 | `''` |
| `netPrice` | `register(..., { setValueAs: v => v === '' ? undefined : Number(v) })` | **`undefined`** |
| `taxType`, `adultProductType`, `originCountryCode` | `Controller`, defaultValue 없음 | **`undefined`** |
| `keyWords` | `register` 안 함 — `watch`/`setValue`만 | **키 자체가 없음** |

**2층 — patch 생성**: 체크된 키를 값과 무관하게 그대로 담았다.

```ts
patch[key] = values[key];   // values[key]가 undefined여도 담긴다
```

**3층 — 전송**: `JSON.stringify`가 그 키를 통째로 삭제한다.

```js
JSON.stringify({ taxType: undefined })   // → "{}"
```

그래서 서버에 도착한 `productSnapshot`은 `{}`다. 얕은 병합은 아무것도 덮지 않고, 서버의 `if (!productSnapshot) return null` 가드는 **`{}`가 truthy라서 통과한다.** 결과적으로 `successCount`가 그대로 N이 되어 성공으로 보고된다.

## 해결

**`undefined`를 patch에 담지 말고 별도 배열로 나른다.**

```ts
// 값이 있는 키만 patch에
export const buildProductBulkPatch = (values, checked) => { /* undefined면 skip */ };

// 값이 undefined인 키는 "비우겠다"는 의사표시로 따로 모은다
export const collectClearKeys = (values, checked): (keyof Product)[] => { /* ... */ };
```

```ts
export interface BulkUpdateMallLinkedProductsBody {
  productSnapshot?: Partial<Product>;
  clearKeys?: (keyof Product)[];   // JSON이 undefined를 못 나르므로 분리
}
```

서버는 병합한 뒤 `clearKeys`의 키를 `delete`한다. 단 **필수 필드 키는 무시한다** — 지워지면 목록 화면이 `price.toLocaleString()`에서 터진다.

빈 문자열(`''`)은 진짜 값이므로 patch에 그대로 실린다. 지우기와 빈 문자열 저장은 다른 의도이며, 이 구분이 유지된다.

## 판별 질문

새 부분수정 API를 만들 때 이것부터 물어라:

> **"이 API로 값을 비울 수 있어야 하는가?"**

그렇다면 `undefined`는 답이 될 수 없다. JSON을 지나는 순간 사라진다. 선택지는 셋이다.

| 방식 | 적합한 경우 |
|------|------------|
| `clearKeys` 배열 분리 | 지울 키가 타입 안전해야 할 때 (이 프로젝트가 택한 방식) |
| `null` 사용 | 타입이 `T \| null`을 허용할 때. `JSON.stringify`가 `null`은 보존한다 |
| 빈 문자열로 통일 | 문자열 필드뿐일 때. 숫자·enum엔 못 쓴다 |

## 이걸 놓친 경로 — 기록해두는 이유

이 결함은 **Task 단위 리뷰 세 번을 전부 통과했다.**

- Task 1 리뷰어가 "체크했는데 값이 `undefined`면 얕은 병합이 기존 값을 지우지 않나"라고 **정확히 이 지점을 물었다.**
- 컨트롤러가 "optional 필드가 지워지는 건 의도된 동작"이라 판정하고 넘겼다. **질문도 답도 틀렸다** — 지워지기는커녕 서버에 도달조차 못 한다.
- 어느 폼 필드가 `undefined`로 끝나는지는 다른 Task에서 결정됐기 때문에, 한 Task만 보는 리뷰로는 세 층을 잇지 못했다.

**교훈:** patch 생성기·직렬화·서버 병합이 서로 다른 파일에 있으면, **셋을 한 번에 보는 검증이 따로 필요하다.** 단위 테스트는 각 층에서 전부 통과했다.

## 테스트에서 주의할 점

`toEqual`로는 이 결함을 잡을 수 없다. Vitest의 `toEqual`은 값이 `undefined`인 키를 무시하기 때문이다.

```ts
expect({ a: undefined }).toEqual({});   // 통과한다
```

**키의 존재 여부를 직접 단언해야 한다.**

```ts
expect('taxType' in patch).toBe(false);
```

관련: [`docs/superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md`](../../superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md)
