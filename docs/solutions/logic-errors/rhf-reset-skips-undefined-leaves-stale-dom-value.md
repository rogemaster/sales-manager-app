---
title: RHF reset()은 값이 undefined인 필드를 건너뛰어, 지워진 필드가 화면에 옛 값으로 남는다
date: 2026-08-28
category: logic-errors
module: features/mallLinkedProduct, features/products
problem_type: stale_ui_state
component: form_state
severity: high
applies_when:
  - 같은 폼에 reset()이 두 번 이상 도는 화면(React Query 캐시 → 리페치 순서 등)
  - 서버 데이터에서 키가 사라질 수 있는 경우(부분 수정으로 optional 필드를 비우는 기능)
  - useEffect로 조회 결과를 폼에 흘려넣는 수정 화면
tags:
  - react-hook-form
  - reset
  - undefined
  - stale-while-revalidate
  - react-query
  - cache-invalidation
---

# RHF reset()은 값이 undefined인 필드를 건너뛰어, 지워진 필드가 화면에 옛 값으로 남는다

## 증상

연동 상품 일괄수정으로 **공급가를 비운 뒤** 그 상품의 수정 화면에 들어가면 **공급가에 지워지기 전 값(5,000)이 그대로 보인다.** 목록으로 나갔다 다시 들어가면 그제야 빈칸이 된다.

폼 상태(`getValues()`)에는 그 값이 없다. **DOM만 옛 값을 붙들고 있다.** 즉 화면이 거짓말을 한다 — 사용자가 그 값을 믿고 저장하면 방금 한 일괄수정이 되돌아간다.

## 근본 원인

두 가지가 겹쳐야 발생한다.

**1. RHF의 `reset()`은 `undefined`를 건너뛴다.**

```js
// react-hook-form 7.59.0 — _reset 내부
for (const fieldName of _names.mount) {
    const value = get(values, fieldName, get(_defaultValues, fieldName));
    if (!isUndefined(value)) {          // ← 여기
        set(values, fieldName, value);
        setValue(fieldName, get(values, fieldName));
    }
}
```

`setFieldValue`는 `undefined`를 `''`로 바꿔주지만(`isNullOrUndefined(value) ? '' : value`), **애초에 호출되지 않는다.** 위 `if`가 막는다. 그래서 그 입력칸의 DOM 값은 **직전 상태 그대로 남는다.**

`_defaultValues` 폴백도 도움이 안 된다 — `_reset`이 시작하면서 `_defaultValues = updatedValues`로 새 값을 넣기 때문에, 새 값에 키가 없으면 폴백도 `undefined`다.

**2. React Query가 낡은 데이터를 먼저 그린다.**

`invalidateQueries`는 캐시를 "오래됨"으로 표시할 뿐 지우지 않는다. 수정 화면에 들어가는 순간 캐시된 값이 먼저 렌더되고, 리페치가 끝나면 새 값으로 다시 렌더된다.

**둘이 만나면:**

| 순서 | 일어난 일 | 입력칸 |
|------|----------|--------|
| 1 | 캐시(수정 전, `netPrice: 5000`)로 `reset` | `5000` |
| 2 | 리페치 완료 → 새 스냅샷(`netPrice` 키 없음)으로 `reset` | **`5000` 그대로** ← 건너뜀 |

한 번만 reset되는 경우(캐시가 아예 없는 두 번째 방문)에는 입력칸이 채워진 적이 없으므로 빈칸으로 보인다. **그래서 "첫 진입엔 옛 값, 두 번째엔 빈칸"이라는 이상한 증상이 된다.**

## 해결

**값이 사라질 수 있는 데이터를 다루는 화면에서는, 낡은 캐시를 보여주지 말고 지운다.**

```ts
onSuccess: () => {
  // 목록은 화면에 떠 있으므로 무효화하면 곧바로 다시 불러온다.
  queryClient.invalidateQueries({ queryKey: [MALL_LINKED_PRODUCTS_QUERY_KEY] });

  // 상세는 무효화가 아니라 제거한다 — reset이 두 번 도는 상황 자체를 없앤다.
  queryClient.removeQueries({ queryKey: [MALL_LINKED_PRODUCT_QUERY_KEY] });
},
```

`removeQueries`는 캐시를 버리므로 수정 화면이 로딩 상태를 잠깐 보여준 뒤 새 값으로 **한 번만** reset한다. 일괄수정 직후의 상세 캐시는 **틀린 것이 확실하므로**, 잠깐의 로딩이 잘못된 값보다 낫다.

## 왜 `undefined`를 명시해도 안 되는가

"키를 지우지 말고 `undefined`를 넣으면 되지 않나" 싶지만 소용없다. `get(values, 'netPrice')`는 **키가 없든 값이 `undefined`든 똑같이 `undefined`를 돌려준다.** 위 `if`는 둘을 구분하지 못한다.

`reset` 자체로 해결하려면 그 필드에 **`undefined`가 아닌 빈 표현**(`''` 등)을 넣어야 하는데, 숫자 필드에 `''`를 넣으면 `valueAsNumber` 변환에서 `NaN`이 되어 폼 상태가 오염된다. 그래서 캐시 쪽에서 끊는 편이 낫다.

## 판별 질문

수정 화면을 만들 때:

1. **이 폼에 `reset()`이 두 번 이상 돌 수 있는가?** — React Query 캐시 → 리페치, 탭 전환, 폴링 등
2. **서버 데이터에서 키가 사라질 수 있는가?** — optional 필드를 비우는 기능이 있으면 그렇다
3. 둘 다 "예"라면 이 함정에 걸린다. **캐시를 지우거나(`removeQueries`), 폼 트리를 remount하거나, reset 대상 객체에 모든 키의 빈 표현을 채워 넣어야 한다.**

## 이걸 놓친 경로

`removeQueries`가 아니라 `invalidateQueries`를 쓴 것은 **기존 `useUpdateMallLinkedProduct`를 그대로 따라한 결과**였고, 리뷰에서도 "형제 훅과 동일 패턴"으로 통과했다.

기존 훅에서 문제가 안 됐던 이유는 **단건 수정은 키를 지우는 경로가 사실상 없었기 때문**이다. 사용자가 직접 공급가를 비운 경우라면 입력칸이 이미 비어 있어서 2차 reset이 건너뛰어도 증상이 없다. **키를 지울 수 있는 기능(일괄수정)이 생기고 나서야 드러나는 함정**이라, 패턴 일치만 보는 리뷰로는 잡히지 않는다.

관련: [`json-stringify-drops-undefined-breaks-field-clearing.md`](json-stringify-drops-undefined-breaks-field-clearing.md) — 같은 기능에서 나온 `undefined`의 다른 함정
