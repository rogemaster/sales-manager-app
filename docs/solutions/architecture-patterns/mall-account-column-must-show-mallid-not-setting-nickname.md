---
title: 1:N 관계에서 상위(계정) 컬럼에 하위(설정)의 별칭을 렌더링하면 안 된다
date: 2026-08-27
category: architecture-patterns
module: features/mallLinkedProduct, features/shoppingSetting
problem_type: architecture_pattern
component: list_screen
severity: medium
applies_when:
  - 목록 컬럼·필터가 1:N 관계의 상위 엔티티를 가리키는데 표시할 값을 하위 엔티티에서 꺼내 오게 될 때
  - denormalize된 필드(mallId)와 하위 구분자(nickname)가 같은 객체 안에 나란히 있을 때
  - 필터의 라벨과 실제 필터 대상 필드가 어긋나 있는지 점검할 때
tags:
  - mallLinkedProduct
  - shoppingSetting
  - shoppingAccount
  - one-to-many
  - list-column
  - search-filter
  - denormalization
---

# 1:N 관계에서 상위(계정) 컬럼에 하위(설정)의 별칭을 렌더링하면 안 된다

## Context

`/shopping/linked-products` 목록의 **'쇼핑몰계정'** 컬럼이 `settingSnapshot.nickname`을 렌더링하고 있었다. `nickname`은 쇼핑몰 계정의 이름이 아니라 **쇼핑몰 정보설정의 별칭**이다. 헤더가 약속한 것과 다른 값이 노출됐다.

같은 화면의 **'쇼핑몰 계정' 필터**도 옵션 이름으로 설정의 `nickname`을 쓰고 있었고, 실제로 거르는 값은 `shoppingSettingId`였다. 라벨·표시값·필터 대상 셋이 전부 어긋나 있었다.

타입 체커는 아무것도 잡아주지 않는다. `mallId`와 `nickname`은 둘 다 `ShoppingSetting`의 `string` 필드이고 같은 객체 안에 나란히 있다.

## Guidance

**`ShoppingSetting`은 계정(`ShoppingAccount`)의 하위 엔티티이므로, 그 안의 필드는 어느 계층의 값인지가 서로 다르다.**

| 필드 | 실제 소속 | 목록에서 쓸 자리 |
|------|----------|-----------------|
| `mallAccountId` | 계정 (참조 키) | 계정 필터의 필터 대상 |
| `mallId` | 계정 (denormalize된 복사본) | **'쇼핑몰계정' 컬럼의 표시값** |
| `nickname` | 설정 (건별 구분자) | **'쇼핑몰정보설정' 컬럼의 표시값** |
| `id` | 설정 | 설정 필터의 필터 대상 |

계정 정보와 설정 정보를 한 컬럼에 뭉개지 말고 **컬럼을 둘로 나눈다.** 계정 1건에 설정이 여러 개 달리므로(→ [`mall-account-to-setting-one-to-many-pattern.md`](mall-account-to-setting-one-to-many-pattern.md)) 어느 한쪽만으로는 행을 특정할 수 없다.

```tsx
// MallLinkedProductTable.tsx — 계정과 설정은 각자 자기 컬럼을 갖는다
<TableCell className="text-center">{linked.settingSnapshot.mallId}</TableCell>
<TableCell className="text-center">{linked.settingSnapshot.nickname}</TableCell>
```

### 필터는 표시값만 바꿔선 안 된다 — 필터 대상까지 바꿔야 한다

'쇼핑몰 계정' 필터를 고칠 때 옵션 이름만 `nickname` → `mallId`로 바꾸는 것은 **틀린 수정**이다. 필터 대상이 여전히 설정 id면, 한 계정에 설정이 여러 개일 때 **같은 이름의 옵션이 여러 개 뜬다.** 사용자는 구분할 수 없는 선택지를 받는다.

라벨이 "계정"이면 필터 대상도 계정이어야 한다.

```ts
// 검색 조건 — 계정과 설정을 각각 갖는다
export interface MallLinkedProductSearch {
  mallAccountId: string;     // 'ALL' 또는 ShoppingAccount.id
  shoppingSettingId: string; // 'ALL' 또는 ShoppingSetting.id
  // ...
}
```

### 설정 옵션은 계정에 종속시킨다

두 필터를 독립적으로 두면 **계정 A + (계정 B에 속한) 설정**을 고를 수 있고, 그 조합은 항상 빈 목록을 낸다. 계정을 고른 뒤에는 그 계정의 설정만 옵션에 남기고, 상위 선택이 바뀌어 현재 값이 옵션에서 사라지면 `'ALL'`로 되돌린다.

```tsx
const settingOptions: FilterOption[] = useMemo(() => {
  if (mallCode === 'ALL') return [];
  return (activeSettings ?? [])
    .filter((setting) => setting.mallCode === mallCode)
    .filter((setting) => mallAccountId === 'ALL' || setting.mallAccountId === mallAccountId)
    .map((setting) => ({ id: setting.id, name: setting.nickname }));
}, [activeSettings, mallCode, mallAccountId]);
```

이 연쇄를 위해 `ActiveShoppingSettingOption`에 `mallAccountId`를 실어 보내야 했다. 선택 옵션 DTO는 **표시에 필요한 필드**만이 아니라 **좁히기에 필요한 상위 키**까지 담아야 한다.

## Why This Matters

- **틀린 값이 그럴듯해서 오래 산다.** 설정 별칭("네이버 기본", "쿠팡 메인")은 계정 이름처럼 읽힌다. 값이 비어 있거나 깨져 보이지 않으니 화면만 봐서는 오류를 알아채기 어렵다.
- **denormalize된 필드가 함정이다.** `ShoppingSetting.mallId`는 성능을 위해 계정에서 복사해 둔 값이다. 하위 엔티티 안에 상위 값이 섞여 있으므로, "`settingSnapshot`에서 꺼냈으니 설정 값"이라는 추론이 성립하지 않는다.
- **연동 데이터에서는 스냅샷이 정본이다.** `sourceShoppingSettingId`로 지금의 오리지널 설정을 거슬러 조회하면 전송 당시와 다른 답이 나올 수 있다. 계정 필터가 오리지널 설정이 아니라 연동 건 자신의 값을 읽는 이유다 — 처음에는 `settingSnapshot.mallAccountId`였고, 2026-09-22 DB화 뒤로는 연동 건의 top-level 컬럼 `mall_account_id`다(불변 식별 필드라 스냅샷에는 사본을 두지 않는다).

## When to Apply

- 목록 컬럼·필터를 붙일 때 **헤더/라벨이 가리키는 엔티티**와 **값을 꺼내 온 엔티티**가 같은지 먼저 확인한다. 한 객체 안에 두 계층 필드가 섞여 있으면 특히 그렇다.
- 필터 표시값이 잘못됐다는 신고를 받으면, 표시값만 고치기 전에 **필터 대상 필드가 그 라벨과 맞는지** 본다. 대개 라벨·표시·대상이 함께 어긋나 있다.
- 상위/하위를 각각 필터로 두면 옵션을 연쇄시키고, 상위가 바뀔 때 하위 선택을 초기화한다.

## Related

- `src/features/mallLinkedProduct/ui/components/MallLinkedProductTable.tsx` — 계정·설정 컬럼 분리
- `src/features/mallLinkedProduct/ui/components/filter/MallLinkedConditionFilter.tsx` — 계정→설정 연쇄 필터
- `src/app/api/shopping/linked-products/list/route.ts` — 계정은 `mall_account_id`, 설정은 `source_shopping_setting_id` 컬럼으로 거른다
- [`mall-account-to-setting-one-to-many-pattern.md`](mall-account-to-setting-one-to-many-pattern.md) — 계정 1 : 설정 N 구조와 `nickname`의 역할
- [`snapshot-entity-source-link-break-is-by-design.md`](snapshot-entity-source-link-break-is-by-design.md) — 연동 데이터가 오리지널과 동기화되지 않는 이유
- `.claude/rules/domain-design.md` — "연동 데이터에서 수정할 수 없는 것" 절 (목록 필터가 전부 컬럼을 읽는다)
