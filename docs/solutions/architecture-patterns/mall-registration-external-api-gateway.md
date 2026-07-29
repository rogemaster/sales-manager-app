---
module: mallRegistration
tags: [external-api, gateway, msw, architecture, mock]
problem_type: design-decision
---

# 몰 등록 전송 — 외부 쇼핑몰 API 게이트웨이 설계 결정

## 배경

PR #35(쇼핑몰 상품등록 화면 구현) 완료 후, 전송 API의 설계 방향을 재검토하면서 도메인 의미와 아키텍처 역할을 명확히 했다.

## 핵심 도메인 명확화

**"몰 등록"은 내부 저장이 아니라 외부 전송이다.**

처음 설계에서 `POST /api/products/mall-registration`을 "우리 DB에 등록 이력을 저장하는 API"로 오해했다.
실제 의미는 **네이버 스마트스토어·카카오·쿠팡 등 외부 쇼핑몰의 상품등록 API를 호출해 전송하는 행위**다.

## 아키텍처 결정: 외부 몰 API 호출 주체는 백엔드

### 프론트엔드가 외부 몰 API를 직접 호출하면 안 되는 이유

1. **API Key 보안**: 외부 몰 API는 발급받은 API Key로 인증한다. 프론트에서 직접 호출하면 Key가 브라우저 네트워크 탭에 노출된다.
2. **CORS**: 외부 쇼핑몰 API는 브라우저 오리진의 직접 요청을 허용하지 않는다. Server-to-Server 호출만 지원한다.
3. **장기 실행 작업**: 상품 100개 × 몰 3개 = 300번 요청. 브라우저 탭이 닫히면 전송이 중단된다. 백엔드 Job/Worker로 처리해야 안정적이다.

### 올바른 플로우

```
프론트 → POST /api/products/mall-registration (우리 백엔드 게이트웨이)
              → 네이버 상품등록 API 호출 (Server-to-Server)
              → 카카오 상품등록 API 호출 (Server-to-Server)
              → 결과 집계
         ← per-item 집계 결과 반환
프론트 ← 성공/실패 결과 표시
```

## 외부 몰 API의 현실적 제약

- 실제 외부 쇼핑몰 API는 **1 요청 = 1 상품**이 원칙이다.
- 대량 전송 서비스들은 백엔드에서 병렬 처리·재시도·큐잉으로 이를 처리한다.
- 현재 우리 프로젝트는 백엔드 미구현이므로 실제 병렬 처리 구현은 불가하다.

## 현재 MSW 시뮬레이션 전략 (Option B)

백엔드 구현 전까지 MSW가 "백엔드 → 외부 몰 API 호출 + 결과 집계" 전체를 시뮬레이션한다.

### 시뮬레이션 동작

- **실패율 약 10%** (랜덤): 현실적인 외부 API 오류 시나리오 재현
- **몰별 고정 오류 메시지**: `NSST` → `"카테고리 매핑 오류"`, `KAKAOS` → `"상품명 글자 수 초과"`
- **delay(800)**: 외부 몰 API 응답 지연 시뮬레이션
- **성공·실패 모두** `MOCK_PRODUCT_DATA`의 `registeredMalls`에 반영 — `mallCode + shoppingSettingId` 조합 단위 upsert(append 아님). 실패 상태도 남아야 후속 화면에서 수정·재전송할 수 있다

### Response 구조

```ts
{
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

per-item 결과 배열(`results`)은 두지 않는다. 실패 상세는 `Product.registeredMalls`에 영속화되고 "쇼핑몰 등록 상품 목록" 화면이 그것을 조회하므로, 응답에 담아도 프론트에서 아무도 읽지 않는다.

## 실패 결과의 귀속: 알림이 아니라 상태

전송 직후 실패 목록을 보여주는 UI(별도 라우트 / 모달 / 인라인)를 검토했으나 모두 채택하지 않았다.

**실패는 "전송 순간의 알림"이 아니라 "등록 상품이 가진 상태"다.** 사용자는 실패를 그 자리에서 소비하고 버리는 게 아니라, 등록 상품 목록에서 사유를 보고 → 수정 → 재전송하는 흐름을 밟는다. 따라서 실패 상세는 전송 화면이 아니라 후속 "쇼핑몰 등록 상품 목록" 화면이 담당한다.

전송 화면은 성공/실패 **건수만** 알림으로 표시한다.

## 전송 결과 초기화 정책

staging은 결과(전체성공·부분실패·전체실패)와 무관하게 **항상 전체 초기화**한다.

초기 설계는 전체 실패 시 staging을 유지해 재시도할 수 있게 했으나, 실패건이 `registeredMalls`에 영속화되어 등록 상품 목록 화면에서 재전송되므로 근거가 사라졌다. staging을 남기면 같은 건이 두 화면에서 동시에 재전송 대기 상태로 보인다.

## 백엔드 구현 시 교체 경로

현재 MSW 핸들러(`src/mocks/handlers/products.ts`의 `mall-registration` 라우트)를 제거하고, 실제 Next.js route handler(`src/app/api/products/mall-registration/route.ts`)를 추가하면 된다. 프론트 코드(`submitMallRegistration` API 함수)는 변경 불필요.
