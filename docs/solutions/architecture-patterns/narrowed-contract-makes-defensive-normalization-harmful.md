---
title: 계약이 좁아지면 방어용 정규화도 함께 지운다 — 남겨두면 막던 것을 통과시키고 저장값을 오염시킨다
date: 2026-09-14
category: architecture-patterns
module: lib/storage, features/products/util
problem_type: architecture_pattern
component: file_upload
severity: high
applies_when:
  - 입력 계약이 합집합(key 또는 URL 등)에서 한 형태로 좁혀질 때
  - 전환기 분기를 지우면서 그 분기를 전제로 추가했던 정규화·우회 방어가 남아 있을 때
  - 검사 함수가 값을 정규화한 뒤 판정하지만 저장은 원본 값으로 할 때
  - 소유권·화이트리스트 검사에서 "정규화 후 통과" 경로를 검토할 때
symptoms:
  - 절대 URL 분기를 지운 뒤에도 본인 공개 주소 전체 URL이 소유권 검사를 통과한다
  - route가 검사를 통과한 원본 URL을 그대로 DB에 저장한다
  - 표시할 때 공개 주소 접두사가 한 번 더 붙어 깨진 주소가 된다
tags:
  - validation
  - normalization
  - ownership
  - contract-change
  - r2
  - security
related_components:
  - authentication
---

# 계약이 좁아지면 방어용 정규화도 함께 지운다 — 남겨두면 막던 것을 통과시키고 저장값을 오염시킨다

## Context

`products.main_image`는 한동안 **R2 key와 외부 절대 URL의 합집합**이었다. 엑셀·시드의 외부 이미지를 그대로 저장했기 때문이다. 그래서 소유권 검사 `isMainImageOwnedBy`는 `^https?://`로 시작하는 값을 무조건 통과시켰다.

목록 썸네일 라운드(2026-09-10)에서 R2 공개 주소가 생기자 이 통과 규칙이 우회로가 됐다. `https://<공개호스트>/images/<남의 ownerId>/…`는 "외부 URL"이라 검사 없이 통과해 남의 이미지를 자기 상품에 걸 수 있었다. 이를 막으려고 `normalizePublicUrl`을 두었다 — 우리 공개 주소로 시작하면 key로 되돌린 뒤 같은 소유자 검사를 태우는 함수다. 이후 대소문자 위장, http 다운그레이드, 기본 포트, dot-segment 변형을 한 겹씩 막았다. (auto memory [claude], 삭제 전 `storage.ts` JSDoc)

엑셀 이미지 R2 가져오기 라운드(2026-09-13)에서 외부 이미지도 가져오기 route를 거쳐 key가 되도록 바꿨다. 사용자 선택으로 기존 외부 URL 21건을 일회성 스크립트로 이전한 뒤 절대 URL 분기를 지웠고, **계약이 R2 key 단일로 좁아졌다.** 이때 `normalizePublicUrl`도 함께 지웠다(Claude 판단, 스펙 §8.5).

## Guidance

### 1. 방어 코드는 "어떤 계약을 전제로 추가됐나"를 먼저 본다

`normalizePublicUrl`은 **"절대 URL은 통과한다"는 계약의 부작용**을 막으려고 생긴 코드다. 그 계약이 사라지면 이 방어도 삭제 대상인지 점검해야 한다. 방어 코드는 "있어서 손해 볼 게 없다"로 남기기 쉽지만, 여기서는 남기는 쪽이 해로웠다(아래 Why This Matters).

### 2. 분기와 정규화를 같이 지우고, 화이트리스트 검사는 유지한다

```ts
// before
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  const value = normalizePublicUrl(mainImage);
  if (/^https?:\/\//.test(value)) return true;
  if (value.split(/[/\\]/).some(isDotSegment)) return false;
  // ...접두사·단일 세그먼트 검사
};

// after
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  if (mainImage.split(/[/\\]/).some(isDotSegment)) return false;

  const prefix = `${PRODUCT_IMAGE_PREFIX}/${ownerId}/`;
  if (!mainImage.startsWith(prefix)) return false; // 절대 URL은 여기서 걸린다

  const rest = mainImage.slice(prefix.length);
  return rest.length > 0 && !/[/\\]/.test(rest);
};
```

유지한 화이트리스트(소유자 접두사, 접두사 뒤 단일 세그먼트, 인코딩 포함 dot-segment, 역슬래시)의 근거는 `src/lib/storage.ts`의 JSDoc에 있다.

### 3. 짝을 이루는 코드를 함께 좁힌다

표시용 `toProductImageUrl`(`src/features/products/util/productImage.ts`)의 절대 URL 분기도 같이 지웠다. 한쪽만 지우면 "표시는 key만 처리하는데 소유권 검사는 URL을 통과시키는" 탈출구가 남는다.

### 4. 순서: 데이터 이전 → 잔여 0건 확인 → 분기 삭제

분기를 먼저 지우면 외부 URL을 가진 기존 상품이 수정 저장에서 막힌다(아래). 2026-09-13 이전 스크립트로 21건을 옮기고, 2026-09-14 dry-run으로 `대상 0건`을 다시 확인한 뒤 지웠다.

### 5. 테스트는 지우지 말고 뒤집는다

- "외부 절대 URL은 통과한다" → **"거부한다"**
- "우리 공개 주소 형태의 본인 key는 통과"(대소문자·http·`:443`·끝 슬래시 변형 각각) → `it.each` 하나로 묶어 **전부 거부**
- 뒤집은 테스트가 옛 코드에서 5건 실패하는 것을 확인(RED)한 뒤 구현했다.

## Why This Matters

**정규화를 남겨두면 생기는 일:**

1. 사용자가 본인 이미지의 공개 주소 전체 `https://pub-xxx.r2.dev/images/usr_me/a.png`를 `mainImage`로 보낸다.
2. 정규화 결과가 본인 key라 소유권 검사를 통과한다.
3. 그러나 route는 **검사한 값이 아니라 원래 값(URL)**을 DB에 저장한다.
4. 표시할 때 `toProductImageUrl`이 접두사를 한 번 더 붙여 `https://pub-xxx.r2.dev/https://pub-xxx.r2.dev/images/…`가 된다.

막으려던 것(남의 key)은 여전히 막지만, 새 계약("key만 저장된다")을 조용히 깨뜨리고 저장값을 오염시킨다. **검사 함수가 정규화한 값으로 판정하고 호출부가 원본을 저장하는 구조**에서는 정규화가 곧 "검사와 저장이 다른 값을 보는" 틈이 된다.

**이전 전에 분기를 지우면 생기는 일:** 상품 수정 화면은 상품 값 전체를 PATCH한다. 외부 URL을 가진 상품은 이미지를 새로 올리기 전까지 수정 저장이 전부 400으로 막힌다. 데모 계정만의 문제가 아니라 모든 계정이 대상이었다.

**테스트를 지우기만 하면 생기는 일:** 누군가 절대 URL 분기를 되살려도 테스트가 잡지 못한다. 뒤집어 두면 계약 변경 자체가 테스트로 고정된다.

## When to Apply

- 값의 허용 범위를 합집합에서 한 형태로 좁힐 때 — 전환기 분기 삭제, 레거시 형식 폐기
- "이 입력은 통과시키되 이 변형은 막는다" 식의 정규화·예외 처리가 남아 있을 때
- 검사 함수가 정규화한 값으로 판정하고 호출부는 원본을 저장하는 경로가 있을 때

## Examples

| 입력 (`OWNER = usr_2f20748f`) | before | after |
|------|--------|-------|
| `https://loremflickr.com/700/700/cat` | `true` | `false` |
| `https://pub-example.r2.dev/images/${OWNER}/abc.png` | `true` (정규화 후 본인 key) | `false` |
| `http://pub-example.r2.dev/images/${OWNER}/abc.png` | `true` | `false` |
| `images/${OWNER}/abc.png` | `true` | `true` |
| `images/${OWNER}/..\\usr_intruder/abc.png` | `false` | `false` |

수동 확인(2026-09-14): 이전된 시드 상품의 썸네일 표시, 수정 화면 저장, 연동상품 수정 화면 미리보기 모두 정상.

## Related

- [`user-input-blocked-by-type-not-sanitizer.md`](user-input-blocked-by-type-not-sanitizer.md) — 직접 선행 문서. "절대 URL 통과 계약"과 그 우회로를 기록한 곳이며, 이 문서가 그 우회로의 최종 정리다
- [`server-side-remote-fetch-ssrf-connect-time-validation.md`](server-side-remote-fetch-ssrf-connect-time-validation.md) — 외부 이미지를 key로 바꾸는 가져오기 route. 계약을 좁힐 수 있게 한 전제
- [`gitignore-whitelist-and-tracked-file-deletion.md`](gitignore-whitelist-and-tracked-file-deletion.md) — 블랙리스트는 새는 쪽으로, 화이트리스트는 막는 쪽으로 실패한다는 같은 결론
- `docs/superpowers/specs/2026-09-10-product-list-thumbnail-design.md` — `normalizePublicUrl`을 도입한 라운드
- `docs/superpowers/specs/2026-09-13-excel-main-image-r2-import-design.md` §8 — 이전 순서와 삭제 근거
