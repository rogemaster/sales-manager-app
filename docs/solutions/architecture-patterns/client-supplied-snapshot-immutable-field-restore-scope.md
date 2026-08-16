---
title: 클라이언트가 완성본을 보내는 수정 API는 불변 필드 복원 범위가 곧 도메인 규칙의 실효 범위다
date: 2026-08-17
category: architecture-patterns
module: features/mallLinkedProduct, features/shoppingSetting, mocks/utils
problem_type: architecture_pattern
severity: low
applies_when:
  - 수정 API가 부분 변경분이 아니라 완성된 객체(스냅샷) 전체를 받을 때
  - "이 필드는 수정 대상이 아니다"라는 도메인 규칙이 코드로 강제되지 않고 있을 때
  - 폼 값을 그대로 payload로 돌려주는 화면에서 일부 필드만 원본 값으로 되돌리는 코드를 볼 때
tags:
  - mallLinkedProduct
  - shoppingSetting
  - snapshot
  - immutable-fields
  - react-hook-form
  - domain-modeling
  - trust-boundary
---

# 클라이언트가 완성본을 보내는 수정 API는 불변 필드 복원 범위가 곧 도메인 규칙의 실효 범위다

## Context

연동 상품 수정(`/shopping/linked-products/[id]`)은 스냅샷 전체를 폼에 부어 편집하고
**완성된 스냅샷을 통째로** 서버에 보낸다. 스펙은 이 방식을 택하면서 불변 필드
5개(`id`·`ownerId`·`mallAccountId`·`mallId`·`mallCode`)를 원본 값으로 복원하도록 지정했는데,
클라이언트(`buildSnapshots`)와 서버(`updateMockMallLinkedProduct`) **양쪽 모두 `mallCode`
하나만** 복원하고 있었다. 2026-08-03 라운드의 코드 리뷰 후속 항목으로 적힌 뒤
2026-08-17까지 남아 있었다.

당시 판단은 "지금은 무해하다"였고 그건 사실이었다. 문제는 **무해함이 두 개의 우연에
기대고 있었다**는 점이다.

- 설정 폼 섹션 어디에도 그 4개 필드를 쓰는 입력이 없다
- `settingForm.reset(linked.settingSnapshot)`에 스냅샷 **전체**를 넣는다 (RHF `reset`은
  폼 값을 통째로 교체하므로, 부분값으로 바뀌면 입력이 없어도 해당 필드가 `undefined`가 된다)

둘 중 하나만 깨져도 스냅샷이 조용히 어긋난다. 타입 체커는 못 잡는다 — 폼 값과 스냅샷의
구조가 같아 그대로 통과한다.

## Guidance

**생성과 수정은 신뢰 경계가 다르다. 이 비대칭이 방어 지점을 결정한다.**

| | 클라이언트가 보내는 것 | 값의 출처 | 어긋날 여지 |
|---|---|---|---|
| 생성 | `{ productId, mallCode, shoppingSettingId }` | **서버가 원본에서 읽어 복사** | 없음 |
| 수정 | 완성된 스냅샷 전체 | 클라이언트 | **서버가 지켜내는 범위만큼만 막힌다** |

생성(`createMockMallLinkedProducts`)은 클라이언트가 보낸 `mallCode`조차 쓰지 않고 조회된
설정에서 가져온다. 애초에 클라이언트 값을 신뢰하지 않으므로 별도 방어가 필요 없다.

수정은 반대다. **"이 필드는 수정할 수 없다"는 도메인 규칙이 실제로 성립하는 범위는,
서버가 되돌려 놓는 필드 목록과 정확히 일치한다.** 규칙이 문서에 있든 없든, 코드가 되돌리지
않는 필드는 수정 가능한 필드다.

따라서 이런 API에서는:

- **복원은 클라이언트와 서버 양쪽에 둔다.** 클라이언트만 고치면 API 직접 호출로 뚫린다.
  서버가 최종 방어선이고, 클라이언트 쪽은 정상 경로에서 값이 왕복하며 틀어지는 것을 막는다.
- **복원 목록은 도메인 규칙의 코드 표현이다.** 주석으로 "몰 선택 필드가 없어 정상 경로에선
  안 바뀐다"고 적는 것은 현재 상태의 기술일 뿐 규칙이 아니다.
- **과잉 고정도 함께 검증한다.** 식별 정보를 고정하면서 같은 객체의 수정 대상 값(별칭 등)까지
  막아버리지 않는지 테스트로 잡는다.

## 발견 단서

**한 필드만 명시적으로 되돌리는 코드를 보면 "왜 이것만인가"를 묻는다.** 방어 코드가 한 겹
있다는 것은 그 자리가 위험하다는 신호이고, 그 위험이 한 필드에만 해당하는 경우는 드물다.

이번 건도 `const mallCode = record.mallCode;` 한 줄이 단서였다. 그 한 줄이 있다는 것은
"폼 값을 그대로 믿으면 안 되는 자리"임을 이미 알고 있었다는 뜻인데, 같은 성질의 필드
4개가 옆에서 그대로 통과하고 있었다.

## 증상이 안 보이는 이유까지 확인한다

어긋난 스냅샷이 **목록 화면에서는 드러나지 않는다.** 검색·필터가 전부 top-level
(`ownerId`·`mallCode`·`sourceShoppingSettingId`·`status`)과 `productSnapshot`만 읽고
`settingSnapshot`은 보지 않기 때문이다.

실제 파급은 두 곳이다.

- **재전송 payload가 다른 계정을 향한다** — 외부몰에 실제로 나가는 값이라 가장 무겁다
- **수정 화면 주소록 조회가 틀어진다** — `ShoppingSettingAddressSection`이
  `watch('mallId')` 기준으로 출고지/반품지를 불러온다

"어디서 증상이 나는가"를 확인하지 않으면 심각도를 잘못 잡는다. 처음엔 목록 필터가 깨질
거라고 봤는데 실제로는 아니었고, 대신 **증상이 안 나는 만큼 늦게 발견되는** 종류였다.

## 규칙을 코드로 옮겨도 컴포넌트 공유는 남는다

*"쇼핑몰·쇼핑몰계정은 어차피 수정 못 하게 할 건데 왜 방어가 필요한가"* 가 자연스러운 반문이다.
의도적으로 그 입력을 붙일 사람은 없다. 실제 경로는 이쪽이다.

```
ShoppingSettingCreateLayout ┐
ShoppingSettingModifyLayout ┼→ ShoppingSettingForm ┐
                            ┘                      ├→ BasicInfo / Address / MallInfo Section
MallLinkedProductEditLayout ─────(래퍼 없이 직접 나열)┘
```

**설정 화면 사정으로 공유 섹션에 계정 Select를 붙이면 연동상품 수정 화면까지 딸려 들어간다.**
붙이는 사람은 자기 화면만 보고 있다. 이 프로젝트는 같은 모양으로 이미 두 번 당했다 —
[`screen-owned-table-header-constants.md`](screen-owned-table-header-constants.md),
그리고 검색 필터 섹션 재사용으로 store까지 딸려온 건
([`scoped-jotai-provider-breaks-auth-atoms.md`](scoped-jotai-provider-breaks-auth-atoms.md)).

즉 **"규칙상 그럴 일 없다"는 컴포넌트 공유 앞에서 무력하다.** 규칙을 지키는 코드가
데이터가 지나가는 길목(= 스냅샷 조립 지점)에 있어야 한다.

## Implementation

- `buildSnapshots`는 `record.settingSnapshot`에서 네 필드를, `record.mallCode`에서 몰 코드를
  가져온다. **`mallCode`만 레코드가 정본이고 나머지는 원본 스냅샷이 정본**이라 출처가 다르다.
- MSW 핸들러도 동일하게 `linked.settingSnapshot`에서 되돌린다.
- 테스트는 `src/mocks/utils/`에만 붙였다. `buildSnapshots`는 컴포넌트 내부 함수라
  이 프로젝트의 테스트 범위(순수 로직) 밖이다.
- `productSnapshot`의 `productId`·`ownerId`는 이번 범위에서 제외했다. 같은 성질이지만
  현재 결함이 아니라 대칭성 문제이고, 이번에 문서화한 규칙이 쇼핑몰·쇼핑몰계정에 관한
  것이라 범위를 맞췄다. **(미해결 — 필요 시 별도 처리)**

관련: `.claude/rules/domain-design.md`의 "연동 데이터에서 수정할 수 없는 것" 절,
`docs/superpowers/specs/2026-08-03-mall-linked-product-edit-resend-design.md`
