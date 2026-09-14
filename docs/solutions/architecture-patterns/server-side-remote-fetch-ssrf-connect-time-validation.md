---
title: 서버가 사용자 대신 외부 URL을 받아올 때 — 주소 검사는 연결 시점에, 리다이렉트는 매 단계 다시
date: 2026-09-14
category: architecture-patterns
module: lib/remoteImage, app/api/products/image
problem_type: architecture_pattern
component: file_upload
severity: high
applies_when:
  - 사용자가 준 URL을 서버가 대신 요청하는 기능(이미지 가져오기·웹훅·링크 미리보기)을 만들 때
  - 요청 전에 DNS를 조회해 사설 주소를 걸러내는 코드를 쓰려 할 때
  - fetch의 자동 리다이렉트를 그대로 쓰고 있을 때
  - 외부 응답의 Content-Type·Content-Length를 믿고 저장하려 할 때
symptoms:
  - 로그인한 사용자가 169.254.169.254 같은 클라우드 메타데이터 주소를 서버 경유로 읽을 수 있다
  - 조회 시점과 연결 시점 사이에 DNS 응답이 바뀌면 사전 검사를 통과한 뒤 내부 주소로 연결된다
  - 공개 URL이 사설 IP로 리다이렉트되면 검사를 한 번만 하는 코드는 그대로 따라간다
tags:
  - ssrf
  - dns-rebinding
  - remote-fetch
  - redirect
  - r2
  - security
related_components:
  - authentication
---

# 서버가 사용자 대신 외부 URL을 받아올 때 — 주소 검사는 연결 시점에, 리다이렉트는 매 단계 다시

## Context

엑셀 대량등록의 메인이미지는 외부 URL로 들어온다. 사용자 요구(2026-09-10)는 이것도 "내려받아 내부 이미지 클라우드인 r2 서버에 저장"하는 것이었다. 즉 **로그인한 사용자가 적은 임의의 URL로 서버가 요청을 보내게 된다.** 막지 않으면 사용자가 서버를 통해 내부망이나 클라우드 메타데이터(`169.254.169.254`)를 읽을 수 있다(SSRF).

구조는 사용자 선택으로 전용 엔드포인트 두 개를 클라이언트가 행마다 호출하는 방식이 됐다 — `POST /api/products/image/check`(확인만), `POST /api/products/image/import`(R2 저장 후 key 반환). 방어는 새 패키지 없이 Node 내장 `http`/`https`/`dns`/`net`으로 구현했다(Claude 판단). 구현은 `src/lib/remoteImage.ts` 한 파일이다.

## Guidance

`fetchRemoteImage(url)`은 아래 순서로 검사한다. 실패는 전부 코드가 붙은 `RemoteImageError`(8종)로 던지고, route가 400과 사유 메시지로 바꾼다.

### 1. URL 사전 검사 — 스킴·포트·자격증명

```ts
if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new RemoteImageError('INVALID_URL');
// WHATWG URL은 스킴의 기본 포트를 빈 문자열로 정규화한다. 값이 남아 있으면 기본 포트가 아니다.
if (url.port !== '') throw new RemoteImageError('INVALID_URL');
if (url.username || url.password) throw new RemoteImageError('INVALID_URL');
```

### 2. IP 리터럴은 URL 단계에서 따로 막는다

IP 리터럴 호스트는 DNS 조회(`lookup`)를 거치지 않고 바로 연결된다. 연결 시점 검사만 두면 이 경로가 빠진다. `2130706433`·`0x7f.1` 같은 변형은 URL 파서가 이미 `127.0.0.1`로 정규화해 주므로 정규화된 `hostname`만 검사하면 된다.

```ts
const host = url.hostname.replace(/^\[|\]$/g, '');
if (net.isIP(host) && isBlockedAddress(host)) throw new RemoteImageError('BLOCKED_ADDRESS');
```

### 3. 도메인은 연결 시점에 검사한다 — 핵심

**fetch 전에 `dns.lookup`으로 따로 확인하지 않는다.** 전역 `fetch` 대신 `http(s).request`에 커스텀 `lookup`을 넘겨, 검사를 통과한 **바로 그 주소로** 소켓이 연결되게 한다.

```ts
export const safeLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    // 주소가 여러 개면 하나라도 차단 대상일 때 거부한다 — 연결 단계에서 어느 주소가 고를지 모른다
    if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
      return callback(new RemoteImageError('BLOCKED_ADDRESS'), '');
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
};
```

`options.all` 분기는 "Node 20의 autoSelectFamily가 `all: true`로 호출하는 경우가 있다"는 계획 단계 판단에 따른 것이다. **이 전제는 실측하지 않았다.**

### 4. 차단 판정은 순수 함수로 — 판정할 수 없는 값은 막는다

`isBlockedAddress(ip)`:

| 계열 | 범위 |
|------|------|
| IPv4 | `0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`(메타데이터), `172.16/12`, `192.168/16`, `224/4`, `240/4` |
| IPv6 | `::`, `::1`, `fc00::/7`, `fe80::/10`, `ff00::/8` |
| 내장 IPv4 | `::ffff:a.b.c.d`(IPv4-mapped)와 `64:ff9b::/96`(NAT64)는 IPv4를 꺼내 위 표로 다시 판정 |

`net.isIP`가 거짓인 값은 차단이다.

### 5. 리다이렉트는 자동으로 따르지 않는다

3xx면 `Location`을 현재 URL 기준으로 해석해 **1단계부터 다시** 적용한다. 다음 요청도 `safeLookup`을 다시 거친다. 최대 3회.

`Location`이 `http://[`처럼 깨진 값이면 `new URL()`이 `TypeError`를 던진다. 잡지 않으면 원격 서버가 우리 route를 500으로 만들 수 있으므로 `resolveRedirectUrl`이 `INVALID_URL`로 바꾼다.

### 6. 응답은 믿지 않는다

- **시간:** 요청 시작부터 전체 10초(`AbortSignal.timeout`).
- **크기:** `Content-Length`가 4MB를 넘으면 본문을 읽지 않는다. 헤더가 없거나 거짓이어도 **누적 바이트**가 넘는 순간 `res.destroy()`.
- **형식:** `Content-Type`은 무시하고 매직넘버(`detectImageType`)로만 판정한다. key의 확장자와 R2 `ContentType`도 판정값에서 온다.

### 7. 확인과 저장을 나눈 이유

`check`는 내려받아 검사만 하고 **R2에 저장하지 않는다.** 엑셀 업로드 시점에 저장하면, 사용자가 미리보기에서 저장하지 않고 초기화할 때 파일만 남는다. 실제 저장은 저장 버튼을 누른 뒤 정상 행만 `import`로 한다(사용자 선택). 두 route 모두 `requireSession`을 먼저 통과해야 한다.

## Why This Matters

| 빠뜨린 방어 | 실제로 뚫리는 경로 |
|------------|------------------|
| 조회를 fetch 전에 따로 함 | fetch가 DNS를 **다시** 조회한다. TTL 0인 공격자 도메인이 두 번째 응답을 `169.254.169.254`로 바꾸면 사전 검사를 통과한 요청이 메타데이터로 간다(DNS rebinding) |
| IP 리터럴을 `lookup`에서만 막음 | `http://[::ffff:127.0.0.1]/`·`http://2130706433/`이 조회 없이 로컬로 연결된다 |
| fetch 자동 리다이렉트 사용 | 공인 서버의 `302 Location: http://10.0.0.5/admin`이 검사 없이 내부망에 닿는다 |
| `Content-Length`만 확인 | 헤더를 빼고 무한 스트림을 보내면 서버리스 함수 메모리가 고갈된다 |
| `Location` 파싱 예외 방치 | 원격 서버가 우리 route를 500으로 만들고, 오류 사유 분류가 깨진다 |

## When to Apply

- 사용자가 입력한 URL을 서버(route handler·스크립트)가 대신 요청할 때 — 이미지 가져오기, 웹훅, 링크 미리보기 등
- 받아온 응답 본문을 저장하거나 형식을 판정할 때
- 새 의존성 없이 Node 내장 모듈로 해결해야 할 때 — 같은 모듈을 일회성 이전 스크립트(`scripts/migrateMainImagesToR2.ts`, git 제외)도 재사용했다

## Examples

- 테스트(`src/lib/remoteImage.test.ts`): `http://0x7f.1/a.png`·`http://[::ffff:127.0.0.1]/a.png` → `BLOCKED_ADDRESS`, `https://example.com:8443/a.png` → `INVALID_URL`, `safeLookup('localhost')` → 연결 전 거부, `64:ff9b::a9fe:a9fe` → 차단.
- 수동 확인(2026-09-14): 엑셀에 `http://127.0.0.1/a.png`를 넣은 행만 `[메인이미지] 허용되지 않는 주소입니다.`로 잡히고, picsum의 리다이렉트 URL은 정상 통과. 비로그인 `POST /check`·`/import` → 401.

### 알려진 한계

- **호출 횟수 제한이 없다.** 로그인한 사용자는 이 엔드포인트로 서버가 외부에 요청하게 만들 수 있다. 기존 `/api/products/image`에 개수 상한이 없는 것과 같은 수준이며, 계정당 상한은 미확인 후보로 남아 있다.
- IDN 호스트·IPv6 zone id의 해석은 `dns.lookup` 결과에 맡긴다.

## Related

- [`user-input-blocked-by-type-not-sanitizer.md`](user-input-blocked-by-type-not-sanitizer.md) — 재사용한 매직넘버 판정·key 조립, "클라이언트가 선언한 형식을 믿지 않는다"는 같은 원칙
- [`api-route-session-auth-guard.md`](api-route-session-auth-guard.md) — 두 route가 쓰는 세션 가드
- [`auth-db-msw-boundary.md`](auth-db-msw-boundary.md) — "시크릿은 없지만 서버에서 외부 요청을 해야 한다"도 route handler 사유가 된다
- [`narrowed-contract-makes-defensive-normalization-harmful.md`](narrowed-contract-makes-defensive-normalization-harmful.md) — 이 엔드포인트가 생기면서 mainImage 계약이 key 단일로 좁아진 결과
- `docs/superpowers/specs/2026-09-13-excel-main-image-r2-import-design.md` §5 — 설계 문서
