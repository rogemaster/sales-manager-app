---
title: 검증보다 먼저 정규화하면 잘못된 입력이 "값 없음"이 된다 — PATCH가 기존 값을 지우는 경로
date: 2026-09-17
category: architecture-patterns
module: features/products, app/api/products
problem_type: architecture_pattern
component: data_mapping
severity: medium
applies_when:
  - 쓰기 route에서 값을 정규화(trim, 빈 값 → null 등)한 뒤 검증할 때
  - 정규화 함수가 "모르는 타입"을 null로 돌려줄 때
  - PATCH가 필드 단위로 값을 덮어쓸 때
symptoms:
  - "PATCH에 customerCode: true를 보내면 200이 나고 기존 코드가 사라진다"
  - 잘못된 타입의 값이 400 없이 "값 없음"으로 저장된다
tags:
  - validation
  - normalization
  - patch
  - write-path
  - data-integrity
---

# 검증보다 먼저 정규화하면 잘못된 입력이 "값 없음"이 된다

## Context

고객사 상품코드는 쓰기 route에서 **검증보다 먼저 정규화**한다. 길이 검사와 중복 비교가 저장될 값(공백을 지운 값) 기준이어야 하기 때문이고, 그 순서 자체는 맞다.

문제는 정규화 함수의 모양이었다.

```ts
export const normalizeCustomerCode = (value: unknown): string | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string') return null; // ← true, {}, [] 도 전부 "코드 없음"
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};
```

`null`은 "코드 없음"이라는 **정상 값**이다. 선택 필드라 검증은 통과한다. 그래서:

- `POST`에 `customerCode: true` → 코드 없이 등록, 200
- `PATCH`에 `customerCode: true` → **기존 코드 삭제**, 200

화면의 입력칸은 항상 문자열을 보내 재현되지 않았고, 사용자 권한 안의 요청이라 보안 문제도 아니다. 하지만 잘못된 요청이 거부되지 않고 데이터를 바꾼다.

## Guidance

**정규화 앞에 "모양 검사"를 따로 둔다.** 정규화는 받아들이기로 한 모양 안에서만 값을 다듬고, 그 밖의 모양은 정규화에 도달하기 전에 거부한다.

```ts
export const findCustomerCodeInputProblem = (value: unknown): 'TYPE' | 'LENGTH' | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return 'TYPE';
  if (typeof value !== 'string' && typeof value !== 'number') return 'TYPE';
  return String(value).trim().length > CUSTOMER_CODE_MAX_LENGTH ? 'LENGTH' : null;
};

// route — 정규화 전에
if (findCustomerCodeInputProblem(data.customerCode) === 'TYPE') {
  return NextResponse.json({ error: CUSTOMER_CODE_TYPE_MESSAGE }, { status: 400 });
}
const values = { ...data, customerCode: normalizeCustomerCode(data.customerCode) };
```

- 길이 상한은 **상수 하나**(`CUSTOMER_CODE_MAX_LENGTH`)를 쓰기 스키마·확인 API·엑셀 미리보기가 공유한다. 확인 API만 상한이 없거나 다르면, 엑셀 미리보기의 긴 코드 하나가 확인 요청 전체를 400으로 만들어 **모든 행이** 확인 실패로 표시된다.
- 서버의 모양 검사는 **클라이언트 입력 경로를 고친 뒤에도 남긴다.** 엑셀의 불리언 셀은 파싱에서 글자로 읽게 고쳤지만(`excel-cell-type-leaks-through-raw-parse.md`), 화면을 거치지 않는 PATCH는 파싱과 무관하다.

## Why This Matters

"모르는 값은 null"은 정규화 함수 안에서 보면 안전한 기본값이다. 하지만 `null`이 도메인에서 **의미 있는 값**(값 없음, 값 삭제)이면, 그 기본값은 "잘못된 입력을 삭제 명령으로 바꾸는" 변환이 된다. 순수 함수 테스트(`normalizeCustomerCode(true) → null`)는 이 동작을 **정상으로 고정**하고 있었다.

## When to Apply

- 정규화 함수가 `null`/`''`/기본값을 돌려주는 분기를 가질 때, 그 분기에 들어오는 입력이 **정상적인 빈 값인지 잘못된 모양인지** 구분되는지 본다
- PATCH처럼 필드 존재 여부로 "덮어쓰기"를 판단하는 경로에 정규화를 붙일 때
- 테스트에 `(잘못된 타입) → null` 같은 기대값이 있으면 의도인지 다시 묻는다

## Examples

- `src/features/products/util/customerCode.ts` — `findCustomerCodeInputProblem`, `CUSTOMER_CODE_MAX_LENGTH`
- `src/app/api/products/create/route.ts`, `[productId]/route.ts`, `bulk/route.ts` — 정규화 전 거부

## Related

- `excel-cell-type-leaks-through-raw-parse.md` — 같은 증상의 클라이언트 쪽 원인
- `absent-optional-value-arrives-as-null.md` — 선택 필드의 null을 "값 없음"으로 받는 규칙(그 규칙이 이 구멍의 전제다)
- `user-input-blocked-by-type-not-sanitizer.md`
