# 주문수집 페이지 설계

## 개요

등록된 쇼핑몰 계정에서 주문을 수집하는 페이지. 필터로 수집 대상을 조회하고, 체크된 행에 대해 수집을 트리거한다. 수집 진행률은 테이블 행 내에 인라인으로 표시한다.

---

## 페이지 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ [필터 Card]                                                       │
│  Row1: 검색 기간  [YYYY-MM-DD] ~ [YYYY-MM-DD]  [7일][15일][30일][1년] │
│  Row2: 쇼핑몰    [쇼핑몰 선택 ▼]  [아이디 선택 ▼]          [검색] │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      [주문수집 버튼]                               │
│               (체크 없으면 비활성화, 중앙 정렬)                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ [체크박스] 쇼핑몰명  아이디  수집상태  작업ID  최종수집일자           │
│ [  ]      쿠팡     seller1  완료     JOB-001  2026-05-25 14:30:00 │
│ [✓]      지마켓    gadmin1  수집중   JOB-002  ████░░ 100/500       │
│ [  ]      옥션     admin1   실패     JOB-003  2026-05-24 09:00:00 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```
src/features/order/ui/collect/
├── OrderCollectionLayout.tsx          ← 전체 레이아웃 조합
├── CollectionFilterSection.tsx        ← Card 래퍼 + 검색 버튼 핸들링
├── CollectionActionSection.tsx        ← 주문수집 버튼 (mutation 호출)
├── CollectionTableSection.tsx         ← TanStack Query 조회 + 테이블 렌더링
└── components/
    ├── CollectionDateFilter.tsx       ← Row1: 날짜 범위 + 빠른선택 버튼
    └── CollectionMallFilter.tsx       ← Row2: 쇼핑몰 + 아이디 드롭다운
```

---

## 상태 관리

**파일:** `src/features/order/store/collect.store.ts`

| atom | 타입 | 설명 |
|------|------|------|
| `collectStartDateAtom` | `string` | 검색 시작일 (기본: 오늘 -7일) |
| `collectEndDateAtom` | `string` | 검색 종료일 (기본: 오늘) |
| `collectMallAtom` | `string` | 선택된 쇼핑몰 코드 (기본: `'ALL'`) |
| `collectMallAccountIdAtom` | `string` | 선택된 계정 ID (기본: `'ALL'`) |
| `collectSearchParamsAtom` | `CollectionSearchParams` | 검색버튼 클릭 시 확정된 쿼리 파라미터 |
| `selectedJobIdsAtom` | `string[]` | 테이블에서 체크된 작업 ID 목록 |

- 검색버튼 클릭 전까지 `collectSearchParamsAtom`은 갱신되지 않아 API 호출이 발생하지 않음
- `collectMallAtom`이 `'ALL'`이거나 비어있으면 아이디 드롭다운은 `disabled`

---

## 데이터 모델

**파일:** `src/features/order/types/collection.types.ts`

```typescript
export type CollectionStatus = 'WAITING' | 'COLLECTING' | 'COMPLETED' | 'FAILED';

export interface CollectionJob {
  id: string;                  // 작업ID (예: JOB-001)
  mallName: ShoppingMalls;     // 쇼핑몰명
  mallAccountId: string;       // 쇼핑몰 계정 아이디
  status: CollectionStatus;    // 수집상태
  lastCollectedAt: string;     // 최종수집일자 (YYYY-MM-DD HH:mm:ss)
  totalCount?: number;         // 수집 대상 총 건수 (COLLECTING 시 존재)
  collectedCount?: number;     // 현재까지 수집된 건수 (COLLECTING 시 존재)
}

export interface CollectionSearchParams {
  startDate: string;
  endDate: string;
  mallCode: string;
  mallAccountId: string;
}

export interface TriggerCollectionBody {
  jobIds: string[];
}
```

---

## API 설계

CLAUDE.md 규칙에 따라 `src/app/api/` route 파일 생성 없이 MSW handler만 추가.

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/order/collection/jobs` | 필터 파라미터로 수집 작업 목록 조회 |
| `POST` | `/api/order/collection/trigger` | 선택된 jobId 배열로 수집 트리거 |

### GET /api/order/collection/jobs

Query params: `startDate`, `endDate`, `mallCode`, `mallAccountId`

Response: `CollectionJob[]`

### POST /api/order/collection/trigger

Request body: `{ jobIds: string[] }`

Response: `{ success: true, triggeredCount: number }`

**MSW 비즈니스 로직 위치:**
- `src/mocks/data/MockCollectionJobsData.ts` — 정적 mock 데이터
- `src/mocks/utils/getCollectionJobs.ts` — 필터 적용 조회 로직
- `src/mocks/utils/triggerOrderCollection.ts` — 상태를 COLLECTING으로 변경 + 진행률 시뮬레이션

---

## Feature API 함수

**파일:** `src/features/order/api/`

| 파일 | 함수 | 설명 |
|------|------|------|
| `getCollectionJobs.ts` | `getCollectionJobs(params)` | 수집 작업 목록 조회 |
| `triggerOrderCollection.ts` | `triggerOrderCollection(jobIds)` | 수집 트리거 |

---

## 수집상태 표시 규칙

| status | 표시 방식 |
|--------|-----------|
| `WAITING` | 회색 배지 "대기중" |
| `COLLECTING` | `collectedCount / totalCount` 텍스트 + 애니메이션 Progress bar |
| `COMPLETED` | 초록 배지 "완료" |
| `FAILED` | 빨간 배지 "실패" |

---

## 실시간 진행률 폴링

- TanStack Query `refetchInterval`을 사용
- `COLLECTING` 상태인 job이 하나라도 있으면 2초마다 refetch
- 모든 job이 `COMPLETED` 또는 `FAILED`가 되면 폴링 중단
- 수집 트리거 성공 시 Toast 알림: `"n개 수집을 시작했습니다."`

---

## 주문수집 버튼 동작

1. `selectedJobIdsAtom`이 비어있으면 버튼 `disabled`
2. 클릭 시 `POST /api/order/collection/trigger` 호출 (body: 선택된 job ID 배열)
3. 성공 시 Toast 표시 + 테이블 refetch → 해당 행 상태가 `COLLECTING`으로 변경됨
4. 체크 해제 (`selectedJobIdsAtom` 초기화)

---

## 쇼핑몰 계정 연동

- 아이디 드롭다운 옵션은 기존 `/api/mall-accounts?mallCode=XXX` API 활용
- 쇼핑몰 선택 시 해당 mall의 계정 목록을 로드
- 쇼핑몰 미선택(`ALL`) 상태에서 아이디 드롭다운은 `disabled`
