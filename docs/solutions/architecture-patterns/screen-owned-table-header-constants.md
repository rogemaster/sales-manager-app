---
title: 화면별 테이블 헤더 상수 분리 — 공유 상수 재사용 시 컬럼 밀림 위험
date: 2026-07-29
category: architecture-patterns
module: features/mallRegistration
problem_type: architecture_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - 다른 화면(다른 feature)의 테이블 헤더 상수를 그대로 import해서 재사용하려 할 때
  - 새 화면이 기존 목록 화면과 컬럼 구성이 다를 때(일부 컬럼 제외/추가/순서 변경)
  - 상품/주문 등 같은 도메인 데이터를 여러 화면에서 서로 다른 형태로 테이블 렌더링할 때
symptoms:
  - 테이블 헤더 컬럼 수와 바디에서 실제 렌더링한 TableCell 개수가 어긋나 컬럼이 한 칸씩 밀려 보인다
  - 빈 상태(empty state) 행의 colSpan이 헤더 배열 길이 기준인데 실제 렌더링 셀 수와 안 맞는다
  - 재사용한 원본 화면(예: products/list)의 헤더 상수가 나중에 바뀌면 전혀 관계없는 다른 화면이 조용히 깨진다
related_components:
  - tooling
tags:
  - table
  - ui-convention
  - constants
  - architecture
  - column-alignment
  - mallRegistration
---

# 화면별 테이블 헤더 상수 분리 — 공유 상수 재사용 시 컬럼 밀림 위험

## Context

"쇼핑몰 상품등록"(`/shopping/register`) 화면의 상품 테이블을 만들면서, 이미 `products/list` 화면이 쓰던 `LIST_TABLE_HEAD`(`src/features/products/constant/table.constants.ts`, 8개 컬럼: 상품코드/상품명/카테고리/공급가/판매가/판매상태/등록일/수정일)를 그대로 재사용했다.

문제는 새 화면의 바디 행이 처음부터 "공급가" 컬럼을 렌더링하지 않았다는 점이다(등록 액션 화면에서 공급가는 필요 없는 정보였음). `LIST_TABLE_HEAD.map(...)`으로 헤더는 8개가 그대로 나오는데, 바디는 7개 셀만 렌더링하니 헤더와 바디 컬럼 수가 어긋나 모든 컬럼이 한 칸씩 밀려 보이는 버그가 코드 리뷰에서 발견됐다.

처음 든 생각은 "누락된 공급가 셀을 추가하면 되지 않나"였지만, 애초에 이 화면은 공급가를 보여줄 필요가 없었다. 즉 진짜 문제는 셀 누락이 아니라 **다른 화면 전용으로 만들어진 상수를 그대로 재사용한 것** 자체였다.

## Guidance

**화면(또는 feature)마다 자신의 테이블 헤더 정의를 소유한다. 다른 feature의 헤더 상수를 직접 import해서 재사용하지 않는다.**

이 코드베이스에는 이미 이 원칙이 적용된 선례가 있다 — `shoppingSetting` feature는 `products`의 `LIST_TABLE_HEAD`를 쓰지 않고 자신만의 `SHOPPING_SETTING_TABLE_HEAD`(`src/features/shoppingSetting/constant/shoppingSetting.constants.ts`)를 갖고 있다. 이번 사례는 이 선례를 따르지 않고 재사용을 시도하다 발생한 문제였다.

```typescript
// src/features/mallRegistration/constant/mallRegistration.constants.ts
import { TableTitleValue } from '@/types/common.type';

export const MALL_REGISTRATION_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode', title: '상품코드', width: 'w-40' },
  { id: 'productName', title: '상품명' },
  { id: 'categoryCode', title: '카테고리', width: 'w-28' },
  { id: 'productPrice', title: '판매가', width: 'w-28' },
  { id: 'productStatus', title: '판매상태', width: 'w-28' },
  { id: 'productCreateDate', title: '등록일', width: 'w-32' },
  { id: 'productUpdateDate', title: '수정일', width: 'w-32' },
];
```

컬럼 수를 셀 때는 체크박스 컬럼과 배지/액션 컬럼처럼 헤더 배열에 없는 고정 컬럼도 함께 계산해야 한다 — 이번 화면은 `MALL_REGISTRATION_TABLE_HEAD.length(7) + 체크박스(1) + 등록예정 쇼핑몰(1) = 9`가 헤더와 바디 양쪽에서 일치해야 했다.

## Why This Matters

- **재사용한 상수가 "소유자 화면" 기준으로 계속 바뀔 수 있다.** `LIST_TABLE_HEAD`는 `products/list` 화면이 필요에 따라 컬럼을 추가/제거할 수 있는 상수인데, 이걸 그대로 참조하는 다른 화면은 자기가 손댄 적 없는 변경에 의해 조용히 깨진다.
- **"컬럼이 필요 없다"는 요구사항과 "상수를 공유한다"는 구현이 충돌하면 항상 요구사항이 이긴다.** 공급가가 필요 없는 화면이라면, 공급가가 포함된 상수를 억지로 맞추기보다 화면 전용 상수를 만드는 게 자연스럽다.
- 헤더/바디 컬럼 수 어긋남은 타입 에러로 잡히지 않는다 — 브라우저에서 눈으로 보거나 코드 리뷰에서 개수를 세어봐야 발견된다.

## When to Apply

- 새 화면의 테이블이 기존 목록 화면과 컬럼 구성이 다르다면(제외/추가/순서 변경), 처음부터 화면 전용 헤더 상수를 만든다. "일단 재사용하고 나중에 맞춘다"는 접근은 이번처럼 밀림 버그로 이어지기 쉽다.
- 컬럼 목록을 만들 때는 헤더 배열 렌더링(`.map`)과 바디 행 렌더링을 나란히 놓고 개수를 세어본다 — 체크박스/액션 등 배열에 없는 고정 컬럼도 함께 포함해서.
- `colSpan`을 배열 길이 기반으로 계산하는 빈 상태 행이 있다면, 그 계산식도 실제 렌더링 컬럼 수와 일치하는지 함께 확인한다.

## Related

- `src/features/mallRegistration/constant/mallRegistration.constants.ts` — 이번에 신설한 화면 전용 헤더 상수
- `src/features/shoppingSetting/constant/shoppingSetting.constants.ts` — `SHOPPING_SETTING_TABLE_HEAD`, 동일 원칙의 기존 선례
- `src/features/products/constant/table.constants.ts` — `LIST_TABLE_HEAD`, `products/list` 전용 상수(참고로, 이 파일 자체도 8개 헤더에 7개 셀만 렌더링하는 동일한 유형의 버그를 이미 갖고 있었다 — 이번 작업에서는 신규 파일만 고치고 기존 파일은 범위 밖으로 남겨둠)
- `docs/superpowers/specs/2026-07-28-mall-registration-action-ui-design.md` / `docs/superpowers/plans/2026-07-28-mall-registration-action-ui.md` — 이 결정이 나온 작업의 설계/계획 문서
