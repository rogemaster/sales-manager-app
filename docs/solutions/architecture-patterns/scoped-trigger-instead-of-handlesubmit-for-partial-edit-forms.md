---
title: 부분 수정 폼은 handleSubmit 대신 trigger(체크된 필드)를 써야 재사용 섹션의 required와 공존한다
date: 2026-08-27
category: architecture-patterns
module: features/mallLinkedProduct, features/products
problem_type: architecture_pattern
component: form_validation
severity: medium
applies_when:
  - 기존 폼 섹션 컴포넌트를 "일부 필드만 수정하는" 새 화면에서 재사용할 때
  - 재사용 대상 컴포넌트 안에 required 규칙이 박혀 있을 때
  - 폼 필드 중 일부만 제출 대상인 화면(체크박스로 고르는 일괄수정 등)을 만들 때
tags:
  - react-hook-form
  - validation
  - trigger
  - handleSubmit
  - component-reuse
  - bulk-edit
---

# 부분 수정 폼은 handleSubmit 대신 trigger(체크된 필드)를 써야 재사용 섹션의 required와 공존한다

## 문제

일괄수정 화면은 "필드마다 체크박스, 값은 전부 빈 상태"로 시작한다. 사용자가 체크한 필드만 수정 대상이다.

여기서 기존 상품 폼 섹션을 재사용하고 싶은데, 그 컴포넌트들은 원래 "전체를 입력받는" 화면용이라 **`required` 규칙이 컴포넌트 안에 박혀 있다.**

```tsx
// ProductInformationDisclosureSection — 세 화면이 공유한다
<Controller name="informationDisclosure.key" rules={{ required: '상품정보고시를 선택해주세요.' }} />
```

`handleSubmit`을 쓰면 **등록된 모든 필드를 검증한다.** 사용자가 정보고시를 체크하지 않았어도 그 섹션의 `required`가 걸려 제출 자체가 막힌다.

## 흔한 오답 — 컴포넌트에 모드 플래그를 넣는 것

```tsx
<ProductInformationDisclosureSection bulkMode />   // ← 하지 말 것
```

그 컴포넌트를 쓰는 **다른 세 화면**(`/products/create`, `/products/[id]`, `/shopping/linked-products/[id]`)이 전부 이 플래그에 묶인다. 영원히 `false`를 넘기는 화면들이 플래그의 존재를 알아야 하게 된다.

이 프로젝트는 같은 실패를 이미 두 번 겪었다 — [`ui-conventions.md`](../../../.claude/rules/ui-conventions.md)의 "검색 필터는 화면이 소유한다"와 [`domain-design.md`](../../../.claude/rules/domain-design.md)의 "설정 폼 섹션 3개는 세 화면이 공유한다" 경고가 그것이다.

## 해결 — 검증 범위를 호출부가 좁힌다

`handleSubmit`을 버리고 **체크된 그룹의 필드명만 모아 `trigger()`에 넘긴다.**

```ts
const checkedFieldNames = collectCheckedFieldNames(checked);  // (keyof Product)[]
if (!(await valuesForm.trigger(checkedFieldNames))) return;

const values = valuesForm.getValues();
```

체크하지 않은 정보고시는 목록에 없으므로 그 `required`가 아예 돌지 않는다. 컴포넌트는 **한 글자도 고치지 않는다.**

## 왜 이게 성립하는가 — 부모 경로가 중첩 규칙까지 검증한다

`collectCheckedFieldNames`는 `'informationDisclosure'`라는 **부모 경로**를 돌려주는데, `required`는 `informationDisclosure.key`와 `informationDisclosure.fields.*`라는 **자식**에 걸려 있다. 부모만 넘겨도 자식이 검증될까?

**된다.** react-hook-form 7.59.0 소스에서 확인:

- `trigger(name)`은 해당 경로의 노드에 `_f`(필드 등록 정보)가 없으면 **서브트리 전체**를 검증기에 넘긴다
- 검증기(`executeBuiltInValidation`)는 비-리프 자식으로 **무조건 재귀한다**

`informationDisclosure` 자신은 register되지 않고 자식만 register되므로, 부모 경로 하나로 모든 하위 `required`가 걸린다.

**단, 이건 버전 의존 동작이다.** RHF 메이저 업그레이드 시 이 전제를 다시 확인해야 한다. 확인이 어려우면 구체 경로를 나열하는 것이 안전하다.

## 함께 필요한 것 — 필수 필드 빈값 차단

`trigger`는 **RHF에 등록된 `required` 규칙**만 검증한다. 새로 만든 섹션들은 의도적으로 `required`를 걸지 않으므로(대부분 비어 있는 게 정상이니까), 그 필드들은 `trigger`가 통과시킨다.

그래서 제출 직전에 별도 검사가 하나 더 붙는다.

```ts
// 상품 폼이 필수로 받는 필드는 체크했으면 값이 반드시 있어야 한다
// (기준은 Product 타입의 optional 여부가 아니다 — 규정 정보는 하위호환 때문에 타입상 optional이지만 폼은 필수다)
const hasEmptyRequired = REQUIRED_BULK_EDIT_GROUPS.some(
  (group) => checked[group] === true &&
    PRODUCT_BULK_EDIT_GROUPS[group].some((key) => values[key] === undefined || values[key] === ''),
);
```

**검증이 두 갈래인 이유:** 재사용 섹션의 필수는 컴포넌트가 알고(`trigger`), 새로 만든 섹션의 필수는 상품 폼 기준을 옮겨 적은 목록이 안다(`REQUIRED_BULK_EDIT_GROUPS` — 상품 폼에 필수를 늘리면 이 배열도 함께 늘린다, [[same-form-three-screens-three-validation-mechanisms]]). 둘을 한 곳으로 합치려면 재사용 섹션의 `required`를 뜯어야 하는데, 그건 세 화면을 건드리는 일이다.

## 판별 질문

기존 폼 컴포넌트를 "일부만 입력하는" 화면에서 재사용하려 할 때:

1. **그 컴포넌트에 `required`가 있는가?** → 있으면 `handleSubmit`을 쓸 수 없다
2. **컴포넌트를 몇 화면이 공유하는가?** → 둘 이상이면 모드 플래그는 답이 아니다
3. **바인딩 경로가 같은가?** → 값 폼을 원본과 같은 flat 구조로 두면 재사용이 성립한다. 체크 상태 같은 부가 정보는 폼 밖(별도 state·context)으로 뺀다

관련: `docs/superpowers/specs/2026-08-27-mall-linked-product-bulk-edit-design.md`
