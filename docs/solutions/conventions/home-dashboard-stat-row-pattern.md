---
title: 홈 대시보드 다중 도메인 통계 행 테이블 패턴
date: 2026-06-02
category: conventions
module: features/home
problem_type: convention
component: frontend_design
severity: medium
applies_when:
  - 홈 화면에 도메인별 통계 영역을 추가할 때
  - 새로운 도메인(배송, 정산 등)의 통계 카드를 홈에 추가할 때
  - 통계 데이터 소스가 동일한 두 도메인을 하나의 API로 묶을지 판단할 때
  - 홈 통계 API에 날짜 필터 파라미터를 추가할 때
tags:
  - home
  - dashboard
  - stat-cards
  - row-table
  - domain-color
  - HomeOrderStats
  - date-filter
  - msw
  - convention
---

# 홈 대시보드 다중 도메인 통계 행 테이블 패턴

## Context

홈 화면에 상품 외 주문·클레임·문의 도메인 통계 영역을 추가했다. 초기 구현은 기존 `StatCards`(개별 카드 그리드)와 동일한 패턴으로 도메인마다 카드 4개씩 배치했으나, 도메인이 4개가 되자 카드가 난잡하고 시각적 계층이 무너졌다. 전면 리디자인을 통해 컴팩트 행 테이블(row table) 패턴으로 교체했다.

## 레이아웃 패턴: 컴팩트 행 테이블

도메인 = 행, 항목 = 열로 구성한다. 각 행은 왼쪽 도메인 레이블 + 수직 구분선 + 통계 열들로 이루어진다.

```
[ 상품  | 판매중  품절  판매중지 ]
[ 주문  | 신규    발주  송장     ]
[ 클레임| 취소    반품  교환     ]
[ 문의  | 신규    긴급  완료     ]
```

**이 패턴을 선택한 이유:**
- 도메인이 늘어도 페이지 세로 길이가 선형으로만 증가한다 (카드 그리드는 영역별 가로 공간도 소비)
- 시선이 위아래로 도메인을 빠르게 스캔하고, 좌우로 항목을 읽는다
- 각 행이 독립적이라 도메인 추가/제거가 행 한 줄 추가/삭제로 끝난다

### Tailwind 클래스 구조 (도메인별 색상 예시)

```tsx
// 행 컨테이너 — 배경 틴트 + 테두리로 화이트 배경에서 구분
<div className="flex items-center rounded-xl border border-{color}-100 bg-{color}-50/60 px-[18px] py-[14px]
               dark:border-{color}-900 dark:bg-{color}-950/30">

  {/* 도메인 레이블 */}
  <span className="w-[60px] shrink-0 text-[11px] font-bold uppercase tracking-[1px]
                   text-{color}-600 dark:text-{color}-400">
    도메인명
  </span>

  {/* 수직 구분선 */}
  <div className="mx-[18px] h-8 w-px shrink-0 bg-{color}-200 dark:bg-{color}-800" />

  {/* 통계 열들 */}
  <div className="flex flex-1">
    <div className="flex flex-1 flex-col items-center gap-1
                    border-r border-{color}-100 px-3 last:border-r-0
                    dark:border-{color}-900">
      <span className="text-[26px] font-extrabold leading-none tracking-tight
                       text-{color}-700 dark:text-{color}-300">
        {value}
      </span>
      <span className="whitespace-nowrap text-[10px] text-{color}-400 dark:text-{color}-500">
        {label}
      </span>
    </div>
  </div>
</div>
```

### 도메인별 색상 체계

| 도메인 | color  | 배경 (라이트)    | 레이블 색상    | 수치 색상      |
|--------|--------|-----------------|---------------|---------------|
| 상품   | slate  | `slate-50`      | `slate-600`   | `slate-700`   |
| 주문   | indigo | `indigo-50/60`  | `indigo-600`  | `indigo-700`  |
| 클레임 | red    | `red-50/60`     | `red-600`     | `red-700`     |
| 문의   | emerald| `emerald-50/60` | `emerald-600` | `emerald-700` |

> 화이트 배경 환경에서는 배경 틴트 + 테두리 조합이 필수다. `bg-card`만 사용하면 행이 배경에 섞여 구분이 되지 않는다.

### HomeLayout 조립

```tsx
<div className="flex flex-col gap-1">
  {stats && <StatCards stats={stats} />}
  {orderStats && <OrderStatCards stats={orderStats} />}
  {orderStats && <ClaimStatCards stats={orderStats} />}
  <InquiryStatCards />   {/* 미개발 도메인: 데이터 없이 0 표시 */}
</div>
```

`gap-1`로 행 간격을 최소화해 테이블처럼 보이게 한다.

## 데이터 소스가 같은 도메인은 타입과 API를 통합

주문과 클레임은 **데이터 소스가 동일**하다(`MOCK_ORDERS_DATA.orderStatus`). 별도 API로 나누면 같은 데이터를 두 번 스캔하고 쿼리도 두 번 발생한다.

```typescript
// ✅ 하나의 타입으로 통합
export interface HomeOrderStats {
  newOrder: number;       // NEW_ORDER
  confirmedOrder: number; // CONFIRMED_ORDER
  invoice: number;        // INVOICE_REGISTER + INVOICE_COMPLETE
  cancelClaim: number;    // REQUEST_CANCEL + PROGRESS_CANCEL
  returnClaim: number;    // REQUEST_RETURN + PROGRESS_RETURN
  exchangeClaim: number;  // REQUEST_EXCHANGE + PROGRESS_EXCHANGE
}

// ✅ 하나의 엔드포인트로 통합
// POST /api/home/order-stats → HomeOrderStats
```

```typescript
// src/mocks/utils/getHomeOrderStats.ts
export const getMockHomeOrderStats = (startDate: string, endDate: string): HomeOrderStats => {
  const filtered = MOCK_ORDERS_DATA.filter((o) => {
    const date = o.orderCollectionDate.split(' ')[0]; // 'YYYY-MM-DD HH:mm:ss' → 'YYYY-MM-DD'
    return date >= startDate && date <= endDate;
  });

  const count = (...statuses: OrderStatusTypes[]) =>
    filtered.filter((o) => statuses.includes(o.orderStatus)).length;

  return {
    newOrder: count('NEW_ORDER'),
    confirmedOrder: count('CONFIRMED_ORDER'),
    invoice: count('INVOICE_REGISTER', 'INVOICE_COMPLETE'),
    cancelClaim: count('REQUEST_CANCEL', 'PROGRESS_CANCEL'),
    returnClaim: count('REQUEST_RETURN', 'PROGRESS_RETURN'),
    exchangeClaim: count('REQUEST_EXCHANGE', 'PROGRESS_EXCHANGE'),
  };
};
```

**판단 기준:** 두 도메인의 통계를 집계하는 데 같은 컬렉션을 순회한다면 하나의 타입·엔드포인트로 통합한다. 데이터 소스가 다르면(예: 문의는 별도 컬렉션) 분리한다.

## 통계 API에 날짜 필터 추가하기

### GET 대신 POST를 사용하는 이유

날짜 필터는 쿼리 파라미터(`?startDate=&endDate=`) 대신 **POST body**로 전송한다. 이유: 향후 쇼핑몰·상태 등 필터 조건이 추가될 때 URL이 복잡해지지 않고, 백엔드가 필터 객체를 일관되게 파싱할 수 있다. 이 프로젝트의 목록 조회 API(`/api/orders/list`, `/api/products/list`)도 모두 POST body 방식을 따른다.

> **교훈 (실수 기록):** 이 API는 처음에 GET으로 만들었다가 POST로 수정했다. "조회니까 GET"이라는 REST 의미론만 보고 `handlers.ts`의 기존 패턴을 확인하지 않은 것이 원인이다. **새 API를 추가할 때는 REST 원칙보다 프로젝트 내 기존 핸들러 패턴을 먼저 확인하고 맞춘다.**

### 날짜 기본값: 7일

홈 화면 통계의 기본 조회 범위는 7일이다. `HomeLayout`에서 `dayjs`로 계산해 쿼리에 전달한다.

```typescript
// HomeLayout.tsx
const endDate = dayjs().format('YYYY-MM-DD');
const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

const { data: orderStats } = useQuery({
  queryKey: ['home', 'order-stats', startDate, endDate], // 날짜를 key에 포함 — 날짜 변경 시 자동 리패치
  queryFn: () => getHomeOrderStats(startDate, endDate),
});
```

날짜를 `queryKey`에 포함시키는 이유: 향후 날짜 선택 UI가 추가되어 범위가 바뀔 때 TanStack Query가 자동으로 리패치한다.

### API 함수

```typescript
// src/features/home/api/getHomeOrderStats.ts
export const getHomeOrderStats = async (startDate: string, endDate: string): Promise<HomeOrderStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/order-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  });
  ...
};
```

### MSW 핸들러

```typescript
// handlers.ts
http.post(`${baseUrl}/api/home/order-stats`, async ({ request }) => {
  const { startDate, endDate } = (await request.json()) as { startDate: string; endDate: string };
  return HttpResponse.json(getMockHomeOrderStats(startDate, endDate));
}),
```

### 날짜 필드 선택: orderCollectionDate

주문 데이터에는 `paymentDate`(결제일)와 `orderCollectionDate`(수집일) 두 필드가 있다. 홈 통계는 **시스템에 수집된 시점** 기준으로 집계하므로 `orderCollectionDate`를 사용한다. 실 백엔드에서도 동일한 필드 기준으로 DB 쿼리를 작성해야 한다.

## 미개발 도메인 처리

페이지/API가 아직 없는 도메인은 props 없이 0을 하드코딩해 렌더링한다. 나중에 API가 생기면 props를 추가하고 HomeLayout에서 쿼리를 연결하면 된다. 컴포넌트 인터페이스는 건드리지 않는다.

```tsx
// InquiryStatCards.tsx — API 미개발 상태
export const InquiryStatCards = () => {
  const items = [
    { label: '신규문의', value: '0' },
    ...
  ];
  ...
};
```

## 관련 파일

- `src/features/home/types/home.types.ts` — `HomeStats`, `HomeOrderStats` 타입
- `src/features/home/api/getHomeOrderStats.ts` — 주문/클레임 통계 API 함수
- `src/mocks/utils/getHomeOrderStats.ts` — MSW mock util
- `src/features/home/ui/components/` — `StatCards`, `OrderStatCards`, `ClaimStatCards`, `InquiryStatCards`
- `src/features/home/ui/HomeLayout.tsx` — 행 테이블 조립

## Related

- `docs/solutions/conventions/typescript-type-design-patterns.md` — 타입 설계 컨벤션
