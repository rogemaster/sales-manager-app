---
title: 표시 라벨과 도메인 코드의 경계 — 어디서 바꾸고, 어디서 막고, 어디서는 메우지 않는가
date: 2026-09-11
category: architecture-patterns
module: components/excel, features/products
problem_type: architecture_pattern
component: data_mapping
severity: high
applies_when:
  - 엑셀·CSV 등 사용자가 손으로 적는 입력에서 한글 표시명을 도메인 코드로 바꿔 저장할 때
  - 화면 Select가 쓰는 상수 목록(id/name 쌍)을 다른 입력 경로에서도 써야 할 때
  - 저장 컬럼이 text라 DB가 값을 걸러주지 않는 필드를 다룰 때
  - 상수 목록에 없는 값을 만난 화면이 어떻게 보여줄지 정할 때
symptoms:
  - 엑셀에 적은 '판매중'·'무료'가 코드로 바뀌지 않고 그대로 DB에 저장된다
  - "as Product['state'] 처럼 컴파일 타임 캐스팅만 있고 런타임 변환이 없다"
  - 저장은 조용히 성공하는데 한참 뒤 목록 화면이 통째로 죽는다
  - 상수 목록에서 코드를 찾지 못한 자리에서 TypeError가 난다
tags:
  - excel
  - bulk-upload
  - data-mapping
  - validation-layers
  - type-cast
  - display-boundary
---

# 표시 라벨과 도메인 코드의 경계 — 어디서 바꾸고, 어디서 막고, 어디서는 메우지 않는가

## Context

사용자는 화면에서 '판매중', '무료배송'을 본다. 시스템은 `ON_SALE`, `FREE`를 저장한다. 이 둘을 잇는 상수는 한 곳에 있다 — `PRODUCT_STATUS`(`src/features/products/constant/status.constants.ts`)와 `DELIVERY_TYPE_OPTION`(`src/shared/constant/delivery.constant.ts`).

화면 폼은 이 경계를 신경 쓸 필요가 없다. Select가 `id`를 값으로 내보내기 때문이다. 문제는 **사용자가 값을 손으로 적는 입력 경로**다. 엑셀 대량등록이 그랬다.

`productExcelSaveStrategy`는 셀 값을 이렇게 넘기고 있었다.

```ts
state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
deliveryType: (r['배송정책'] as string) || '',
```

`as`는 컴파일할 때 사라진다. 런타임에는 '판매중'이라는 한글이 그대로 남아 `products.state`에 저장됐다. 컬럼이 `text`라 DB도 거부하지 않았다(`src/db/schema.ts`).

**증상은 저장에서 멀리 떨어진 곳에서 나타났다.** `ProductStatusBadge`가 상수에서 코드를 찾아 표시명으로 바꾸는데, 찾지 못하면 `undefined`가 되고 non-null 단언이 붙어 있어 구조분해가 터진다.

```
TypeError: Cannot destructure property 'name' of 'PRODUCT_STATUS.find(...)' as it is undefined.
```

렌더 중 예외라 React가 트리를 통째로 버린다. 배지 한 칸이 비는 게 아니라 화면이 죽는다. 이 배지는 상품 목록, 홈 최근상품, 연동상품 목록, 몰 등록 목록 네 화면이 쓴다. 잘못된 행 하나가 네 화면을 함께 죽였다.

원인은 엑셀 업로드인데 증상은 목록 화면이었고, 그 사이를 이어주는 단서가 아무것도 없었다.

## Guidance

**층은 셋이고, 각 층의 일은 하나씩이다.**

| 층 | 하는 일 | 위치 |
|---|---|---|
| 입력 검증 | 어느 행의 어느 값이 잘못됐는지 **사용자에게 알린다** | `src/components/excel/utils/validate.ts` |
| 쓰기 경계 | 표시명을 코드로 **바꾼다**. 못 바꾼 값은 통과시키지 않는다 | `src/components/excel/strategies/productExcelSaveStrategy.ts` |
| API | 코드가 아닌 값을 **거부한다** | `src/features/products/util/productCodes.ts` |

**허용 목록은 화면 Select가 쓰는 상수에서 파생시킨다.** 목록을 따로 적으면 코드를 하나 추가할 때 양식과 화면이 갈라진다.

```ts
// src/features/products/constant/bulkTemplate.constant.ts
allowed: PRODUCT_STATUS.map(({ name }) => name),
```

`ExcelTemplateInfo`의 `allowed`는 `req`·`numeric`과 같은 자리에 붙는 선택 속성이다. 붙이면 업로드 검증이 목록 밖의 값을 `INVALID_VALUE` 오류 행으로 잡고, 붙이지 않은 컬럼은 자유 입력으로 남는다.

**API 검증을 생략하지 않는다.** 업로드 검증은 브라우저에서만 돈다. 저장을 막는 마지막 자리는 서버다. 컬럼이 `text`인 한 DB는 아무것도 막아주지 않는다.

```ts
// src/features/products/util/productCodes.ts
export const findInvalidProductCode = (product: Partial<Product>): ProductCodeViolation | null => {
  for (const { key, label, options } of CODE_FIELDS) {
    const value = product[key];
    if (value === undefined) continue; // PATCH는 바꾸려는 필드만 보낸다
    if (!options.some((option) => option.id === value)) return { label, value: String(value) };
  }
  return null;
};
```

등록·수정·대량등록 세 route가 같은 검사를 쓴다. 대량등록은 전체 행을 먼저 보고 몇 번째 행인지 알려준다 — 일부만 넣고 나머지를 거부하면 어디까지 반영됐는지 알 수 없는 절반짜리 상태가 된다.

**표시 층에서는 디폴트 값으로 메우지 않는다.** 상수에서 못 찾은 값은 원문을 그대로 보여준다.

## Why This Matters

**디폴트로 메우면 화면이 데이터에 대해 거짓말을 한다.** DB에 '무료'가 들어 있는데 화면이 '무료배송'이라고 적으면, 사용자는 그 상품이 무료배송으로 설정돼 있다고 믿는다. 잘못된 행은 영원히 발견되지 않는다.

그리고 그 값은 화면에만 머물지 않는다. 외부몰로 전송될 때는 DB의 원래 값이 실려 나가 거부당한다. 화면은 멀쩡했는데 전송만 실패하는 상황이 되어 원인을 찾기가 훨씬 어려워진다. 배송정책은 특히 위험하다 — 무료로 잘못 보이는 쪽은 돈이 걸린 오해다.

**쓰기 경계에서 디폴트로 떨어뜨리는 것은 반대로 옳다.** 바로 앞 검증이 사용자에게 이미 알렸고, 그 자리는 "무엇을 저장할지" 정하는 자리다. 같은 처리가 표시 층에서는 틀리는 이유는 그 자리에는 알려줄 사람이 없기 때문이다.

**`as` 캐스팅은 검증이 아니다.** 타입 선언은 경계에서 확인된 사실이 아니라 약속이다. 값이 `text` 컬럼에서 오는 한 타입 체커는 약속이 깨지는 순간을 볼 수 없다.

## When to Apply

- 표시명과 코드값이 `{ id, name }` 상수로 분리돼 있고, 그 상수를 화면 Select가 쓰는 필드
- 사용자가 값을 손으로 적는 입력 경로(엑셀·CSV·외부 연동 수집)가 그 필드에 값을 넣을 때
- 저장 컬럼이 `text`처럼 제약이 없어 DB가 걸러주지 않을 때
- 하나의 표시 컴포넌트를 여러 화면이 공유해, 잘못된 값 하나의 파급이 넓을 때

## Examples

**쓰기 경계 — before**

```ts
state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
deliveryType: (r['배송정책'] as string) || '',
```

컴파일은 통과하고 '판매중'이 그대로 저장된다.

**쓰기 경계 — after**

```ts
const toCode = (options: FilterOption[], value: unknown): string | undefined =>
  options.find((option) => option.name === toText(value))?.id;

state: (toCode(PRODUCT_STATUS, r['판매상태']) as Product['state']) || 'WAIT_SALE',
deliveryType: toCode(DELIVERY_TYPE_OPTION, r['배송정책']) || '',
```

**입력 검증 — 사용자가 보는 것**

```
[배송정책] '무료'는 사용할 수 없는 값입니다. (사용 가능: 무료배송, 유료배송, 착불, 조건부 무료배송)
```

값 목록의 정본이 상수 하나이므로, 이 문구를 따로 관리하지 않는다. `DELIVERY_TYPE_OPTION`의 이름이 '무료배송'이지 '무료'가 아니라는 사실이 메시지에 그대로 드러난다.

**표시 층 — 이 프로젝트의 선례**

```ts
// src/features/order/ui/detail/OrderInfoSection.tsx
{DELIVERY_TYPE_OPTION.find((t) => t.id === order.orderDeliveryType)?.name ?? order.orderDeliveryType}
```

찾으면 표시명, 못 찾으면 원문. 화면은 죽지 않고, 이상한 값이 눈에 보여 그 행을 고칠 수 있다.

**표시 층 — 아직 그렇지 않은 자리**

```ts
// src/components/common/ProductStatusBadge.tsx
const { name } = PRODUCT_STATUS.find((value) => value.id === status)!;
```

2026-09-11 시점에 이 단언은 **의도적으로 남겨두기로 했다.** API 검증이 들어오는 값을 막게 되면서 남은 유입 경로는 DB 직접 수정과 연동상품 스냅샷 둘뿐이고, 둘 다 이번 범위에서 제외하기로 사용자가 판단했다(연동상품 쪽은 그 화면에 엑셀 기능이 붙는 시점에 같은 검증을 넣기로 미뤘다). 즉 "안전해서 남긴 것"이 아니라 **남은 위험을 확인하고 감수한 것**이다. 이 자리를 다시 만나면 위 선례 형태로 바꾸면 된다.

## Related

- `.claude/rules/excel.md` — 엑셀 전략·타입 정의 가이드. 이 변경으로 `allowed`와 `INVALID_VALUE`가 추가됐다
- [`user-input-blocked-by-type-not-sanitizer.md`](user-input-blocked-by-type-not-sanitizer.md) — 같은 세 route(등록·수정·대량등록)에 공용 검사를 꽂는 같은 패턴을, 업로드 키 조립에 적용한 사례
- [`db-null-vs-domain-undefined-boundary.md`](db-null-vs-domain-undefined-boundary.md) — 저장과 도메인 사이의 어긋남이 한참 뒤 화면에서 드러나는 같은 계열의 문제
- `docs/solutions/integration-issues/excel-template-text-format-prevents-data-loss.md` — 같은 `ExcelTemplateInfo`에 붙는 `numeric` 플래그. 양식에 컬럼을 추가할 때 함께 본다
