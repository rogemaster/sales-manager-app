---
title: 사용자가 관리하는 값의 중복 규칙은 "누가 요구하는가"로 정하고, 결론은 값마다 갈린다 — skuCode는 두고 customerCode는 막는다
date: 2026-09-16
category: architecture-patterns
module: features/products, .claude/rules
problem_type: architecture_pattern
component: data_mapping
severity: medium
applies_when:
  - 선택값에 필수·유니크·중복 검증을 추가할지 판단할 때
  - 기존 규칙("중복은 사용자 책임")과 반대로 보이는 요구가 들어왔을 때
  - 한 필드의 선례를 근거로 다른 필드의 검증 여부를 정하려 할 때
  - 중복 차단 요구의 범위(무엇을·어디까지·어느 데이터에)를 정할 때
tags:
  - validation
  - uniqueness
  - domain-rule
  - user-managed-value
  - sku
  - customer-code
---

# 사용자가 관리하는 값의 중복 규칙은 "누가 요구하는가"로 정하고, 결론은 값마다 갈린다

## Context

`.claude/rules/domain-design.md`에는 두 규칙이 나란히 있다.

1. **외부몰이 요구하는 값** — 필수 여부는 가장 엄격한 몰을 따른다.
2. **사용자가 자기 업무를 위해 관리하는 값** — 위 규칙이 적용되지 않는다. 대표가 `OptionCombination.skuCode`다. 선택값이고, **중복 검증을 하지 않는다.** 중복 판정은 사용자가 한다.

2번은 2026-08-21에 Claude가 코드를 보고 "필수도 아니고 유니크 검증도 없다"를 **누락**으로 읽어 필수·유니크·중복 검증을 제안했다가 전부 기각되며 생긴 규칙이다.

2026-09-13에 사용자가 이렇게 말했다.

> 상품의 중복은 문제될꺼 없어 A상품을 2번 3번 올려도 이건 서비스 자체에서 막지 않을꺼야 단, 예외는 있는데 고객사 상품코드(customerCode) 가 중복되는 경우에는 중복을 막아야 하는데 아직 이 중복등록을 막는 로직이 구현되어 있지는 않을꺼야 이 부분은 추가해야할 부분이긴함.

`customerCode`도 어느 몰이 요구하는 값이 아니라 사용자가 관리하는 선택값이다. 2번 규칙만 기계적으로 적용하면 "막지 않는다"가 되고, 이 요구는 규칙을 뒤집는 것처럼 읽힌다.

## Guidance

**2번 규칙이 정하는 것은 결론이 아니라 "누구의 기준을 따르는가"다.** 판별 질문은 "이 값을 요구하는 주체가 외부몰인가, 사용자인가"이고, 답이 사용자면 검증 강도는 **사용자의 업무 방식**을 따른다.

- `skuCode` — 사용자의 업무 방식이 "내가 판단한다"였다 → 막지 않는다.
- `customerCode` — 사용자의 업무 방식이 "겹치면 막아야 한다"였다 → 막는다.

같은 질문에 답이 다르게 나온 것이지 규칙이 바뀐 것이 아니다. 그래서:

1. **한 필드의 결론을 다른 필드로 옮기지 않는다.** "skuCode도 안 막으니 customerCode도 안 막는다", 거꾸로 "customerCode를 막았으니 skuCode도 막자" 둘 다 판별 질문을 건너뛴 추론이다. 사용자 관리 값은 필드마다 사용자에게 확인한다.
2. **차단 요구를 받으면 범위를 사용자 말 그대로 좁힌다.** 이번 요구에서 막는 것은 **코드의 중복**이지 **상품의 중복**이 아니다(원문: "A상품을 2번 3번 올려도 이건 서비스 자체에서 막지 않을꺼야"). 나머지 경계는 하나씩 물어 정했다.

   | 질문 | 사용자 결정 |
   |------|------------|
   | 범위 | 워크스페이스(`ownerId`) 단위 — 다른 회사의 같은 코드는 허용 |
   | 같다고 보는 기준 | 앞뒤 공백·**대소문자 무시** (처음 "공백만"을 고른 뒤 사용자가 정정: *"'cs-001' 과 'CS-001' 은 중복인거지"*) |
   | 파일 안 중복 | 걸린 행 **전부** 오류 — 어느 쪽이 맞는지 프로그램이 고르지 않는다 |

3. **도메인 규칙상 별개인 데이터에는 번지지 않게 한다.** 연동상품의 `productSnapshot.customerCode`는 검사하지 않는다. 스냅샷은 오리지널과 별개이고 같은 상품을 여러 번 전송할 수 있다.
4. **예외를 규칙 문서의 원래 규칙 바로 옆에, 사용자 원문과 함께 적는다.** 떨어진 곳에 적으면 다음 사람이 두 규칙을 모순으로 읽고 한쪽을 "고치려" 든다. 이번에는 `domain-design.md`의 skuCode 절 안에 "예외 — `Product.customerCode`는 중복을 막는다"를 넣었다.
5. **사용자가 명시적으로 막아달라고 한 규칙은 앱과 DB 양쪽에 둔다.** "사용자 책임" 쪽은 검증 자체가 없으니 강제할 곳도 없지만, "막는다" 쪽은 앱 검사만으로는 동시 저장이 새므로 부분 유니크 인덱스를 함께 뒀다 — [`partial-unique-index-predicate-must-match-deployed-writers.md`](partial-unique-index-predicate-must-match-deployed-writers.md).

## Why This Matters

- **"코드에 검증이 없다"는 누락일 수도, 설계일 수도 있다.** skuCode에서는 설계였고 customerCode에서는 누락이었다. 코드만 보고는 둘을 구분할 수 없으니 규칙 문서와 사용자 확인이 판정 근거가 된다.
- **선례를 규칙으로 일반화하면 양방향으로 틀린다.** 2026-08-21에는 "유니크가 없으니 누락"으로 과하게 막으려 했고, 반대로 skuCode 선례만 믿었다면 이번 요구를 "규칙 위반"으로 되물었을 것이다.
- **범위를 넓게 잡으면 사용자가 허용한 동작을 깨뜨린다.** "중복 차단"을 상품 단위로 해석했다면 사용자가 명시적으로 허용한 "같은 상품 여러 번 등록"이 막혔다.

## When to Apply

- 선택값에 검증을 추가하자는 생각이 들 때: 먼저 그 값을 요구하는 주체를 확인하고, 사용자라면 규칙 문서에 결정이 있는지 보고, 없으면 묻는다.
- 기존 규칙과 반대로 보이는 요구가 왔을 때: 규칙의 **판별 질문**이 무엇이었는지 찾아 그 질문에 대한 새 답인지 확인한다. 그렇다면 규칙 변경이 아니라 예외 추가로 기록한다.
- 차단 요구를 구현할 때: "무엇을 막는가(값 vs 레코드)", "어디까지(테넌트·전역)", "같다의 기준", "별개 데이터(스냅샷 등) 포함 여부"를 하나씩 확정한다.

## Examples

**같은 판별 질문, 다른 결론**

| | `OptionCombination.skuCode` | `Product.customerCode` |
|--|------------------------------|------------------------|
| 요구 주체 | 사용자 | 사용자 |
| 필수 | 아니다 | 아니다 |
| 사용자 입력값의 중복 | 사용자가 판단 — 검사 없음 | **막는다** (워크스페이스 단위, 공백·대소문자 무시) |
| 강제 위치 | 없음 | 확인 API + 쓰기 route 세 곳 + DB 부분 유니크 인덱스 |
| 결정 시점 | 2026-08-21 (검증 제안 기각) | 2026-09-13 (사용자 요구) |

**skuCode 쪽에서도 "사용자 책임"이 전부를 덮지는 않는다.** 사용자가 직접 적은 SKU의 중복은 사용자 책임이지만, 프로그램이 자동 채번해 생긴 중복은 사용자가 만든 적 없는 충돌이라 별개로 고쳤다 — [`array-index-numbering-collides-across-records.md`](array-index-numbering-collides-across-records.md). "사용자 책임"은 **사용자가 입력한 값**에 대한 규칙이라는 점에서 이 문서와 같은 방향이다.

## Related

- `.claude/rules/domain-design.md` — "값을 요구하는 주체가 사용자면 위 규칙이 적용되지 않는다 — `skuCode`" 절과 그 안의 `customerCode` 예외
- [`array-index-numbering-collides-across-records.md`](array-index-numbering-collides-across-records.md) — skuCode "사용자 책임" 규칙의 경계(자동 채번은 별개)
- [`partial-unique-index-predicate-must-match-deployed-writers.md`](partial-unique-index-predicate-must-match-deployed-writers.md) — 이 결정을 DB에서 강제한 방식
- [`snapshot-entity-source-link-break-is-by-design.md`](snapshot-entity-source-link-break-is-by-design.md) — 연동상품 스냅샷이 오리지널과 별개라는 원칙(스냅샷을 검사 대상에서 뺀 근거)
- 설계 근거: `docs/superpowers/specs/2026-09-16-product-customer-code-unique-design.md` (로컬 전용)
