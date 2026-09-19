---
title: 같은 저장소 안에 있는 "남의 시스템"은 import 금지선으로 경계를 집행한다
date: 2026-09-19
category: architecture-patterns
module: simulators/naver, app/api/external, eslint.config.mjs
problem_type: architecture_pattern
component: module_boundary
severity: high
applies_when:
  - 외부 시스템의 대역(시뮬레이터·가짜 서버)을 같은 저장소·같은 빌드 안에 둘 때
  - "이 폴더는 우리 도메인을 몰라야 한다"는 규칙을 주석이나 문서로만 적어두게 될 때
  - 대역이 우리 상수·타입을 재사용하고 싶어질 때(값이 똑같아 보일 때)
  - drizzle 등 코드 생성 도구가 스키마 파일을 직접 실행할 때
symptoms:
  - 가짜 외부몰이 우리 도메인 타입을 import해 두 쪽이 한 몸이 된다
  - 우리 상수를 고쳤을 뿐인데 외부몰의 판정 결과가 함께 바뀐다
  - 문서에는 "복제하라"고 적혀 있는데 코드에는 import가 들어가 있다
tags:
  - simulator
  - module-boundary
  - eslint
  - no-restricted-imports
  - naver
  - drizzle
---

# 같은 저장소 안에 있는 "남의 시스템"은 import 금지선으로 경계를 집행한다

## Context

가짜 네이버 스마트스토어(`src/simulators/naver/`)는 우리 앱과 **같은 저장소·같은 Next.js
빌드** 안에 있다. 실제 세계에서 두 시스템을 갈라놓는 것은 네트워크지만, 여기에는 그 물리적
경계가 없다. `import`가 되니까 하게 되고, 한 번 하면 두 쪽이 한 몸이 된다.

값이 똑같이 생겼을 때 특히 그렇다. 택배사 목록은 우리 `DELIVERY_COMPANY`와 code·name이
전부 같다. "같은 값을 두 번 적는 건 중복"이라는 평소의 감각이 여기서는 정확히 반대로
작동한다 — **우리가 택배사를 하나 추가했다고 외부몰이 그것을 받아주게 되면 안 된다.**

## Guidance

**대역과 본체 사이에 네트워크가 없다면, import 금지선이 그 자리를 대신한다.**
주석이나 설계 문서로는 지켜지지 않는다. 실제로 이번에도 설계가 "복제하라"고 못박은
`delivery.constant`가 1차 구현에서 열려 있었고, 최종 리뷰에서야 막혔다.

`eslint.config.mjs`에 파일 스코프 규칙으로 둔다.

```js
{
  // 가짜 외부몰은 우리 도메인을 모른다. import 금지선이 곧 네트워크 경계다.
  files: ['src/simulators/**/*.ts', 'src/app/api/external/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [
      { group: ['@/features/*', '@/features/**', '**/features/**'], message: '…자체 정의할 것' },
      { group: ['@/mocks/*', '@/mocks/**', '**/mocks/**'], message: '…MSW mock을 알면 안 된다' },
      { group: ['@/db/schema', '**/db/schema'], message: '…네이버 테이블은 simulators 안에 있다' },
      { group: ['**/shared/**', '**/types/**', '**/utils/**', '**/constant/**', '**/components/**'],
        message: '…필요한 값은 자기 이름으로 복제할 것' },
    ]}],
  },
}
```

**막는 것은 도메인이지 인프라가 아니다.** `@/db`(Neon 클라이언트)는 허용한다 — 실제
네이버도 자기 DB를 쓴다. 금지 대상은 **우리 도메인 타입(`@/features`), 우리 테이블
(`@/db/schema`), 우리 공용 모듈(`shared`·`types`·`utils`·`constant`·`components`),
그리고 브라우저 전용 목(`@/mocks`)**이다.

경로 패턴을 `@/features/*`와 `**/features/**` 두 벌로 적은 이유는 별칭과 상대 경로
양쪽을 막기 위해서다. 한쪽만 적으면 `../../features/...`로 우회된다.

## 한계 — 이 규칙이 보지 못하는 것

**동적 `import()`는 걸리지 않는다.** `no-restricted-imports`는 정적 import 선언만 본다.
경계를 넘고 싶은 코드가 생기면 이 구멍으로 나간다. 지금은 시뮬레이터에 동적 import가
없지만, 리뷰에서 이 형태를 보면 규칙이 통과시켰다고 안심하지 말 것.

**폴더를 새로 만들면 `files`에 추가해야 한다.** 규칙은 경로로 걸려 있으므로, 두 번째
시뮬레이터(`src/simulators/kakao/`)는 `src/simulators/**`에 자동으로 포함되지만,
route를 `src/app/api/external/` 밖에 두면 무방비다.

## Implementation

- **drizzle 스키마는 시뮬레이터 폴더 안에 둔다.** `drizzle.config.ts`의 `schema`를 배열로
  바꿔(`['./src/db/schema.ts', './src/simulators/naver/schema.ts']`) 테이블 정의가 우리
  스키마 파일로 새어 나가지 않게 했다. "이 폴더가 곧 가짜 네이버"를 유지하기 위해서다.
- **그 스키마 파일에서는 값 import에 `@` 별칭을 쓰지 않는다.** drizzle-kit이 파일을 직접
  실행하므로 별칭이 해석되지 않는다. 타입 import는 컴파일 시 지워지므로 무관하다.
- route는 세션을 쓰지 않는다. `requireSession`이 아니라 **Bearer API key**로 인증한다 —
  세션은 우리 사용자의 것이고, 여기 들어오는 것은 외부 시스템이다. `src/middleware.ts`의
  `matcher`에 `/api/external`이 없어 세션 리다이렉트도 타지 않는다.
- 경계를 세운 직후 **탐침 파일로 규칙이 실제로 막는지 확인**하고 지웠다. 설정만 넣고
  넘어가면 오타 하나로 규칙 전체가 조용히 무력화된다.

## 판별 기준

> **이 폴더의 코드가 우리 코드를 import할 수 있다면, 실제 배포에서도 그럴 수 있는가?**
>
> - 아니오(다른 프로세스·다른 회사·다른 네트워크) → **금지선이 필요하다.** 값이 같아
>   보여도 복제한다.
> - 예(같은 앱의 다른 레이어) → 평소대로 공용 모듈을 쓴다.

관련: `docs/superpowers/specs/2026-09-19-naver-simulator-design.md`,
`fake-external-service-rules-must-differ-from-ours.md`(왜 규칙까지 달라야 하는가),
`.claude/rules/msw-rules.md`의 route.ts 예외 규정
