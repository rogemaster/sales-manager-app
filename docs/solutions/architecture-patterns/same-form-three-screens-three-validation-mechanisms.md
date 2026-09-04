---
title: 같은 폼 값을 세 화면이 서로 다른 방식으로 검증한다 — 한 곳에 필수를 추가하면 나머지가 조용히 어긋난다
date: 2026-09-04
category: architecture-patterns
module: features/products, features/mallLinkedProduct
problem_type: architecture_pattern
component: form-validation
severity: high
applies_when:
  - 상품 폼에 필수 필드를 추가하거나 기존 필드의 필수 여부를 바꿀 때
  - 여러 화면이 공유하는 폼 섹션 컴포넌트를 수정할 때
  - File이나 객체처럼 input이 아닌 값을 폼 필드로 다룰 때
symptoms:
  - 한 화면에서는 필수인데 다른 화면에서는 빈 값으로 저장된다
  - 라벨에 `*`가 보이는데 제출이 막히지 않는다
  - `trigger()`는 통과하는데 `handleSubmit`은 막거나, 그 반대다
tags:
  - react-hook-form
  - validation
  - shared-components
  - useController
  - fail-open
---

# 같은 폼 값을 세 화면이 서로 다른 방식으로 검증한다

상품 정보를 편집하는 화면이 셋인데, 검증을 거는 층이 셋 다 다르다. 그래서 **한 곳에만 필수를 추가하면 나머지가 조용히 어긋난다.** 컴파일 에러도 테스트 실패도 나지 않는다.

| 화면 | 검증 진입점 | 규칙이 사는 곳 |
|------|------------|---------------|
| 상품등록 · 상품수정 | `handleSubmit` | 공유 섹션 컴포넌트의 `register`/`Controller`/`useController` |
| 연동상품 단건수정 | `productForm.trigger()` + `settingForm.trigger()` | 같은 공유 섹션 + 설정 섹션 |
| 연동상품 일괄수정 | `trigger(체크한 필드)` + 상수 대조 | **자체 `Bulk*` 섹션 → `REQUIRED_BULK_EDIT_GROUPS` 상수** |

앞의 둘은 같은 컴포넌트를 import하므로 규칙이 자동으로 공유된다. **일괄수정만 자체 섹션을 쓰기 때문에 공유 섹션의 `required`가 닿지 않고, 별도의 상수 목록이 그 역할을 대신한다.**

## 실제로 어긋난 사례 둘

### 1. 규정 정보 — 공유 섹션에만 추가해서 일괄수정이 빠졌다

원산지·부가세유형·성인상품여부를 필수로 바꾸면서 `ProductComplianceSection`에 `rules={{ required }}`를 걸었다. 앞의 두 화면은 즉시 적용됐지만 일괄수정은 그대로였다. 체크하고도 빈 값으로 저장할 수 있었다.

더 나쁜 건 그 상수의 **판정 기준 주석**이었다.

```ts
/** 체크했으면 값이 반드시 있어야 하는 그룹 — Product 타입에서 optional(?)이 아닌 필드를 커버한다. */
```

규정 정보는 기존 상품의 하위호환 때문에 `Product`에서 여전히 `optional`이다. 이 기준을 그대로 따르면 **영영 목록에 들어가지 않는다.** 기준 자체가 틀렸던 것이라, 항목만 추가하고 주석을 두면 다음 사람이 주석대로 판단해 되돌린다. 기준을 **"상품 폼이 필수로 받는 값"**으로 바꿔 적어야 한다.

### 2. 메인이미지 — `register()`로 검증이 붙지 않아 가드가 복제됐다

`mainImage`는 `File | string`을 직접 들고 있는 필드다. 파일 입력의 value가 아니라 컴포넌트가 `setValue`로 써넣는 값이라, `register()`로는 **검증 규칙이 붙지 않는다.**

그래서 화면마다 제출 직전에 수동 가드를 뒀다.

```tsx
const onSubmit = (data) => {
  if (!data.mainImage) {
    formData.setError('mainImage', { type: 'manual', message: '메인이미지를 선택해 주세요.' });
    return;
  }
  mutate(data);
};
```

이 가드는 `handleSubmit`을 쓰는 두 화면에만 있었다. **`trigger()`만 쓰는 연동상품 단건수정에는 없었고**, 거기서는 이미지 삭제 버튼(`setValue('mainImage', '')`)을 누르고 그대로 저장·재전송할 수 있었다.

가드를 세 번째로 복제하는 대신 규칙을 폼 층으로 올렸다.

```tsx
const { field, fieldState: { error } } = useController({
  control,
  name: 'mainImage',
  rules: { required: '메인이미지를 선택해 주세요.' },
});
// setValue → field.onChange, errors.mainImage → fieldState.error
```

`useController`로 등록하면 `handleSubmit`과 `trigger()`가 **같은 규칙을 본다.** 수동 가드 2벌은 제거했다.

## 규칙

**1. input이 아닌 값(File·객체·배열)은 `useController`로 등록한다.** `setValue`만으로 다루면 RHF의 검증 대상이 아니게 되고, 그 순간부터 검증은 화면마다 복제되는 수동 코드가 된다. 복제는 반드시 빠뜨리는 화면을 만든다.

**2. 라벨의 `*`는 검증의 근거가 아니다.** 이번에 `*`를 붙이고 나서야 연동상품 쪽이 안 막힌다는 게 드러났다. 표기를 추가할 때는 **그 화면에서 실제로 막히는지**를 따로 확인해야 한다. 표기와 동작이 어긋나면 사용자는 표기를 믿는다.

**3. 필수 필드를 늘릴 때 확인할 곳은 컴포넌트가 아니라 진입점이다.** "이 컴포넌트를 누가 쓰는가"만 보면 일괄수정처럼 **컴포넌트를 공유하지 않는 화면**을 놓친다. `handleSubmit` / `trigger()` / 상수 대조 — 검증 진입점 세 개를 각각 확인한다.

**4. 부분수정 화면은 구조가 다를 수밖에 없다.** 일괄수정이 `trigger(체크한 필드)`를 쓰는 것은 실수가 아니라 요구사항이다. 전체 검증을 돌리면 체크하지 않은 정보고시 때문에 제출이 막힌다. 그래서 통합이 아니라 **목록 동기화**가 답이고, 상수 주석에 "폼에 필수를 늘리면 여기도 늘려라"를 남겨두는 것이 현재의 최선이다.

## 왜 타입 체커가 못 잡는가

`REQUIRED_BULK_EDIT_GROUPS`는 `ProductBulkEditGroupKey[]`라서 **어떤 조합이든 타입이 통과한다.** 비어 있어도 통과한다. `ShoppingSetting`의 캐치올 union arm이 새 몰을 빠뜨려도 컴파일되는 것과 같은 구조다(`domain-design.md`의 "새 몰에 고유 속성 추가 시 체크리스트" 참고).

폼 규칙에서 목록을 파생시킬 수 있다면 컴파일 시점에 강제할 수 있겠지만, 규칙이 JSX 안 `rules={{}}`에 흩어져 있어 지금 구조로는 뽑아낼 수 없다. 그래서 **사람이 기억해야 하는 항목**으로 남는다 — 이 문서와 상수 주석이 그 기억장치다.

## 관련

- `.claude/rules/domain-design.md` — 필수 규칙은 입력 폼의 문제, 검증 책임은 전송 결과의 문제라는 층 구분
- `docs/solutions/architecture-patterns/scoped-trigger-instead-of-handlesubmit-for-partial-edit-forms.md` — 일괄수정이 `handleSubmit`을 못 쓰는 이유
- `docs/solutions/architecture-patterns/screen-owned-table-header-constants.md` — 화면이 공유할 것과 소유할 것을 가르는 같은 계열의 판단
