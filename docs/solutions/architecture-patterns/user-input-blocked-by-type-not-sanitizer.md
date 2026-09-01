---
title: 업로드 키 조립 — 사용자 입력을 소독하지 말고 타입으로 도달 경로를 없앤다
date: 2026-09-01
category: architecture-patterns
module: lib/storage, app/api/products
problem_type: architecture_pattern
component: file_upload
severity: high
applies_when:
  - 업로드된 파일을 저장소 키·경로·파일명으로 조립할 때
  - 클라이언트가 보낸 파일명·MIME·확장자를 쓰려 할 때
  - 새 업로드 엔드포인트(아바타·첨부파일 등)를 만들 때
symptoms:
  - originalName.split('.').pop()처럼 파일명에서 확장자를 뽑아 키에 넣고 있다
  - file.type(브라우저가 보낸 MIME)을 저장 메타데이터로 그대로 쓴다
  - 키에 들어갈 문자열을 정규식으로 걸러내는 sanitize 함수가 있다
tags:
  - file-upload
  - r2
  - s3
  - path-traversal
  - type-safety
  - security
  - literal-union
---

# 업로드 키 조립 — 사용자 입력을 소독하지 말고 타입으로 도달 경로를 없앤다

## Context

상품 메인이미지를 R2에 올리면서 저장 키를 만들어야 했다. 계획 원안은 흔한 방식이었다.

```ts
const ext = originalName.split('.').pop() || 'bin';
const key = `${prefix}/${ownerId}/${uuid()}.${ext}`;
```

구현 단계에서 이게 세 가지를 동시에 흘린다는 게 드러났다.

- **결함:** 점이 없는 파일명(`report`)은 `split('.').pop()`이 파일명 **전체**를 돌려준다 → 확장자 자리에 `report`가 박힌다.
- **path traversal:** 파일명이 `../../victim.png`이면 그 문자열이 키에 섞인다.
- **위조:** 확장자도 `file.type`도 클라이언트가 정하는 값이다. `.png`로 끝나는 실행 파일을 `image/png`라 선언해 올릴 수 있다.

## Guidance

**소독(sanitize)하지 말고, 사용자 문자열이 그 함수에 도달할 수 없게 타입으로 막는다.**

```ts
export type DetectedImage = { ext: 'png' | 'jpg'; contentType: 'image/png' | 'image/jpeg' };

// 실제 바이트(매직넘버)로만 판정한다. 아니면 null → 거부
export const detectImageType = (buffer: Buffer): DetectedImage | null => { ... };

// ext가 리터럴 유니온이라, 파일명 유래 문자열은 인자로 넣는 것 자체가 컴파일 에러다
export const buildImageKey = (prefix: string, ownerId: string, ext: DetectedImage['ext']): string =>
  `${prefix}/${ownerId}/${uuidv4()}.${ext}`;
```

route는 이 순서로 통과시킨다 — **선언된 MIME → 크기 → 실제 바이트 → 감지값으로만 키·메타데이터 조립.**

```ts
const buffer = Buffer.from(await file.arrayBuffer());
const detected = detectImageType(buffer);
if (!detected) return NextResponse.json({ error: '이미지 파일이 아닙니다.' }, { status: 400 });

const key = buildImageKey(PRODUCT_IMAGE_PREFIX, session.ownerId, detected.ext);
await putImage(key, buffer, detected.contentType); // file.type이 아니라 감지값
```

원본 파일명은 **어디에도 쓰지 않는다.** 키의 식별성은 uuid가, 소유 구분은 `ownerId` 세그먼트가 담당한다.

### ownerId 세그먼트는 인가 판정의 근거가 된다

`images/<ownerId>/<uuid>.<ext>` 구조 덕분에 "이 키가 내 것인가"를 문자열만 보고 판정할 수 있다. 상품 생성·수정·대량등록 세 경로 모두 저장 전에 이 검사를 통과시켜, 남이 올린 객체 키를 자기 레코드에 거는 것을 막는다.

```ts
export const isMainImageOwnedBy = (mainImage: string, ownerId: string): boolean => {
  if (/^https?:\/\//.test(mainImage)) return true; // 외부 절대 URL은 계약상 허용
  return mainImage.startsWith(`${PRODUCT_IMAGE_PREFIX}/${ownerId}/`);
};
```

**끝의 `/`가 검사의 핵심이다.** 빼면 `usr_ab`가 `usr_abcd`의 네임스페이스를 통과한다. 접두사 비교는 항상 경계 문자까지 포함해서 한다.

**남아 있는 우회로도 함께 기록한다** — 절대 URL을 무조건 통과시키므로, 우리 버킷 공개 도메인을 가리키는 URL 형태로는 남의 객체를 지정할 수 있다. 표시 코드가 없는 동안은 무해하지만 공개 URL을 도입하는 순간 실효 위험이 된다. 테스트에 `[알려진 우회로]`로 고정해두고(`storage.test.ts`), 공개 URL 도입 시 그 접두사를 key로 정규화해 같은 검사를 태운 뒤 기대값을 뒤집는다.

## Why This Matters

- **sanitize는 "빠뜨린 케이스"가 있는지 사람이 계속 증명해야 하지만, 리터럴 유니온은 컴파일러가 증명한다.** 새 호출부가 생겨도 문자열을 넣으면 그 자리에서 막힌다.
- 검증 실패를 **거부**로 끝내면(400) 저장소에 정체불명 객체가 남지 않는다. 확장자를 `'bin'`으로 대체하는 fallback은 "일단 저장한다"는 뜻이라 나중에 정리 대상이 된다.
- MIME 검사만으로는 부족하고 매직넘버만으로도 부족하다 — 전자는 위조되고, 후자는 4MB짜리 파일을 통째로 읽은 뒤에야 답이 나온다. **싼 검사부터 순서대로** 통과시켜야 큰 파일이 서버 메모리에 올라가기 전에 걸린다.

## When to Apply

- 새 업로드 엔드포인트를 만들 때 → 이 파일(`src/lib/storage.ts`)의 세 함수를 그대로 재사용하고 prefix만 바꾼다. 아바타(`users.avatar`)가 다음 후보다
- 사용자 문자열을 경로·키·파일명에 넣어야 할 때 → 먼저 "안 넣고 해결되는가"를 묻는다. uuid + 서버가 판정한 리터럴로 충분한 경우가 대부분이다
- 접두사 비교로 소유권을 판정할 때 → 경계 문자(`/`)를 포함해 비교하고, 그 케이스를 테스트로 고정한다

## Related

- [`api-route-session-auth-guard.md`](api-route-session-auth-guard.md) — 이 route들이 쓰는 세션 가드
- [`form-generic-split-hides-file-in-snapshot.md`](../logic-errors/form-generic-split-hides-file-in-snapshot.md) — 같은 라운드의 반대 방향 사례(타입이 갈라져 File이 새어나간 쪽)
- `src/lib/storage.ts`, `src/lib/storage.test.ts` — 구현과 경계 테스트
- `docs/superpowers/specs/2026-09-01-product-image-r2-storage-design.md` — 설계 문서(§9에 공개 URL 우회로 오픈 이슈)
