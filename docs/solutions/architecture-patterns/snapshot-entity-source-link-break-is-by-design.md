---
title: 스냅샷 엔티티의 출처 링크 단절은 버그가 아니라 설계상 정상 동작이다
date: 2026-08-15
category: architecture-patterns
module: features/shoppingSetting, features/mallLinkedProduct
problem_type: architecture_pattern
severity: medium
applies_when:
  - 스냅샷을 보유한 파생 엔티티가 있고, 그 원본을 삭제하는 기능을 다룰 때
  - "참조가 끊긴다"는 이유로 삭제 차단·캐스케이드 삭제·소프트 삭제를 검토하게 될 때
  - sourceXxxId처럼 원본을 가리키는 id 필드의 의미를 판단해야 할 때
tags:
  - shoppingSetting
  - mallLinkedProduct
  - snapshot
  - referential-integrity
  - domain-modeling
  - delete-flow
---

# 스냅샷 엔티티의 출처 링크 단절은 버그가 아니라 설계상 정상 동작이다

## Context

쇼핑몰 정보설정(`ShoppingSetting`)을 삭제하면 연동 데이터(`MallLinkedProduct`)의
`sourceShoppingSettingId`가 존재하지 않는 id를 가리키게 된다. 이것이 "정합성 문제"로
미착수 목록에 올라 있었고, 착수 전 결정이 필요한 사항으로 **삭제 차단 / 경고 후 진행 /
소프트 삭제** 세 가지가 후보로 정리돼 있었다.

세 후보는 모두 "끊긴 참조는 고쳐야 할 상태"라는 전제를 공유한다. 그 전제 자체가 틀렸다.

## Guidance

**id 필드가 있다고 해서 그것이 무결성을 지켜야 할 외래키인 것은 아니다. 값 동기화를 하지
않는 필드는 참조가 아니라 출처 표시(추적용)다.**

`MallLinkedProduct`는 전송 시점의 상품·설정 값을 `productSnapshot`·`settingSnapshot`으로
**깊은 복사해 보유**한다. 이 모델에서 이미 확립된 규칙이 하나 있었다 —
**오리지널을 수정해도 연동 데이터는 바뀌지 않는다.** 삭제는 그 규칙의 특수한 경우일 뿐이다.
수정이 전파되지 않는 데이터에 삭제만 전파될 이유가 없다.

따라서:

- 원본이 사라져도 연동 데이터는 **스냅샷만으로 온전히 동작한다** — 조회·수정·재전송 전부
  가능하다. 잃는 것은 "이게 어느 설정에서 나왔는지"를 되짚는 링크뿐이고, 그건 기능이 아니라
  이력 정보다.
- 그러므로 **삭제를 차단하지 않는다.** 사용자가 자기 설정을 지우겠다는데 파생 데이터의
  이력 링크를 이유로 막는 것은, 독립 데이터로 설계해 놓고 종속 데이터처럼 취급하는 것이다.
- **캐스케이드 삭제는 더 나쁘다.** 연동 데이터 1건 = 외부 쇼핑몰에 실재하는 상품 1개다.
  우리 쪽 설정을 지웠다고 외부몰 상품의 관리 레코드를 함께 지우면 실물과 어긋난다.
- **소프트 삭제도 불필요하다.** 링크를 살려두기 위해 삭제된 원본을 남기는 것인데, 애초에
  링크가 기능적 의존이 아니므로 그 비용(목록·필터·중복검사 전부가 `deletedAt`을 의식해야
  함)을 낼 이유가 없다.

남는 실제 문제는 정합성이 아니라 **사용자 인지**다. 지운 뒤에 연동 상품 목록에 그대로
남아 있는 걸 보고 놀라지 않도록, 삭제 확인 창에서 미리 알린다.

```
선택한 2개의 설정을 삭제하시겠습니까?

이 설정으로 전송된 연동 상품 3건이 있습니다.
연동 상품은 삭제되지 않고 그대로 유지됩니다.
```

## Implementation

- 건수 조회는 삭제 직전 전용 엔드포인트 `POST /api/shopping/settings/linked-count`로 한다
  (`ids` + `X-Owner-Id` → `{ totalCount }`). 목록 API 응답에 건수를 얹는 방식도 검토했으나,
  삭제 확인 창 하나 때문에 목록 API·타입·테이블까지 범위를 넓힐 이유가 없었다.
- 소유권 검증은 기존 bulk 컨벤션대로 `allOwnedBy`로 fail-closed. **단, `ownerId`
  null 검사를 함께 해야 한다** — `ids`가 빈 배열이면 `allOwnedBy`의 `.every`가 공허참이라
  헤더가 없어도 통과한다.
- 조회에 실패하면 삭제를 진행하지 않는다. 경고를 못 띄운 채 지우는 것보다 사용자가 다시
  시도하게 하는 편이 낫다.
- 클라이언트 `api/`·타입은 엔드포인트 경로(`/api/shopping/settings/`)를 따라
  `shoppingSetting` 도메인에 둔다. 세는 대상이 연동 데이터라고 해서
  `mallLinkedProduct`에 두지 않는다 — `domain-design.md`의 "API·타입은 엔드포인트가 속한
  도메인에 둔다" 규칙.
- 조회는 `useQuery`가 아니라 `useMutation` + `mutateAsync`로 감쌌다. 버튼을 누른 시점에
  한 번만 필요한 명령형 호출이라 선언형 구독으로 둘 이유가 없다.

## 판별 기준

파생 엔티티의 id 필드를 만났을 때, 그것이 외래키인지 출처 표시인지는 이렇게 가른다.

> **원본이 수정되면 이 데이터도 따라 바뀌어야 하는가?**
>
> - 그렇다 → 참조다. 원본 삭제 시 정합성 처리가 필요하다.
> - 아니다 → 출처 표시다. **원본 삭제도 마찬가지로 전파되지 않는 것이 일관된 동작이다.**

관련: `.claude/rules/domain-design.md`의 "오리지널 데이터와 쇼핑몰 연동 데이터" 절,
`docs/superpowers/specs/2026-08-01-mall-linked-product-list-design.md`
