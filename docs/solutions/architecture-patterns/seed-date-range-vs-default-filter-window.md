---
title: 시드 데이터의 날짜 스프레드가 화면 기본 기간 필터를 넘으면 데이터가 사라진 것처럼 보인다
date: 2026-09-05
category: architecture-patterns
module: features/products, features/mallLinkedProduct, mocks/data
problem_type: architecture_pattern
severity: medium
applies_when:
  - 목록 화면에 시드·픽스처 데이터를 채울 때
  - 날짜 범위 필터를 테스트하려고 시드 날짜를 일부러 넓게 흩으려 할 때
  - 목록 화면에 시딩한 건수보다 적게 나오는 증상을 만났을 때
  - 새 목록 화면에 기본 기간 필터를 붙일 때
symptoms:
  - 20건을 시딩했는데 상품목록에 4건만 나온다
  - 2페이지까지 나와야 할 페이지네이션이 1페이지만 나온다
  - 에러도 빈 화면도 아니어서 데이터 유실이나 페이지네이션 버그로 오인된다
tags:
  - seed-data
  - fixture
  - date-range-filter
  - pagination
  - mock-data
  - debugging
---

# 시드 데이터의 날짜 스프레드가 화면 기본 기간 필터를 넘으면 데이터가 사라진 것처럼 보인다

## Context

Neon `products` 테이블을 20건으로 재시딩하면서 `createDate`를 **2~52일 전**으로 흩어 넣었다. 날짜 범위 필터를 테스트할 수 있게 하려는 의도였다. 그런데 상품목록을 열자 **4건**만 떴다.

원인은 두 지점의 조합이다.

```ts
// src/features/products/store/search.store.ts
const DEFAULT_DATE_TYPE = 'register';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
```

```ts
// src/app/api/products/list/route.ts
if (!isYmd(startDate) || !isYmd(endDate)) {
  return NextResponse.json({ error: '검색 기간이 올바르지 않습니다.' }, { status: 400 });
}
const { start, endExclusive } = toKstDateRange(startDate, endDate);
const dateCol = dateType === 'update' ? products.updateDate : products.createDate;
conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));
```

화면 기본값은 "최근 7일 · 등록일 기준"이고, API는 이 조건을 **우회 경로 없이 무조건** 적용한다. 날짜가 없거나 형식이 틀리면 400으로 거절하므로 "필터 없음" 상태가 존재하지 않는다. 20건 중 `daysAgo` 2·3·5·7만 창에 들어와 정확히 4건이 남았다.

사용자가 기억한 "10건/2페이지"는 착각이 아니라 **이전 데이터에서는 맞는 기억**이었다. 구 픽스처는 20건 전부에 `createDate: new Date()`를 넣어 항상 기본 창 안에 있었다. 데이터 성격이 바뀐 것이지 화면이 고장난 게 아니다.

## Guidance

**목록 화면에 우회 불가능한 기본 기간 필터가 있으면, 시드 데이터의 날짜 스프레드는 그 필터 폭보다 좁아야 한다.** 필터를 테스트하고 싶다는 이유로 폭을 넘겨 흩으면 화면의 기본 진입 상태 자체가 깨진다.

이번 수정은 20건을 **6시간 간격**으로 재배치했다. 가장 오래된 행이 약 4.75일 전이라 7일 창 안에 여유 있게 들어오면서, 6개의 서로 다른 날짜에 걸쳐 있어 날짜 필터는 그대로 테스트할 수 있다. 두 목적은 양자택일이 아니다 — **폭을 창 안으로 넣되 날짜를 서로 다르게** 두면 둘 다 된다.

**상대 날짜로 짰다고 해결되지 않는다.** `daysAgo(n)`을 써도 n이 창 폭에 가까우면 며칠 뒤 그 행이 창 밖으로 밀려난다. "절대냐 상대냐"와 "폭이 창 안이냐"는 서로 다른 축이고, 앞의 것만 지키면 같은 증상이 시간차를 두고 재발한다. 6시간 간격을 택한 것도 가장 오래된 행에 경계까지 약 이틀의 여유를 두기 위해서다.

**고친 뒤에는 화면이 실제로 쓰는 기본 필터 조건을 그대로 재현해 DB에 물어본다.** 이번에는 `dateType: 'register'`, 최근 7일, `pageSize: 10`, `ORDER BY createDate DESC, productId DESC`를 그대로 재현해 `total 20`, `totalPages 2`, 두 페이지 합쳐 중복·누락 없음을 확인했다.

## Why This Matters

**증상이 코드 버그처럼 보인다.** 화면은 "데이터가 유실됐다" 또는 "페이지네이션이 깨졌다"로 읽히지만 `route.ts`도 `search.store.ts`도 정상 동작이다. 코드만 읽어서는 안 잡히고, 필터 폭과 시드 스프레드를 나란히 놓고 봐야 드러난다. 그래서 목록이 예상보다 적게 나올 때는 **API 로직·페이지네이션을 의심하기 전에 기본 필터부터 재현**하는 편이 빠르다.

**같은 함정이 이미 다른 화면에 있었다.** 당시 연동상품 mock 시드(`src/mocks/data/MockMallLinkedProductsData.ts`, 2026-09-22 DB화로 삭제)는 `daysAgo(10)`·`daysAgo(12)`를 썼는데 연동상품 목록의 기본 필터도 최근 7일(`dateType: 'lastSentAt'`)이라, 12건을 심어두고 8건만 보고 있었다. 상품목록에서 원인을 찾기 전까지 아무도 이상하게 여기지 않았다.

**"상대 날짜를 쓰라"는 주석만으로는 막히지 않는다.** 그 파일에는 이미 *"절대 날짜 시드는 시간이 지나면 기본 화면이 비어버린다"* 는 주석이 있었고 실제로 `daysAgo()`를 쓰고 있었다. 주석이 다룬 축(절대/상대)과 실제로 깨진 축(폭)이 달랐던 것이다. 규칙을 적을 때 **어느 축을 막는 규칙인지** 함께 적지 않으면 이런 식으로 비껴간다.

## When to Apply

- 목록 화면에 시드·픽스처를 채우기 전, 그 화면에 **항상 적용되는** 기본 기간 필터가 있는지 확인한다.
- 날짜 필터를 테스트하려고 시드를 넓게 흩을 때, 그 폭이 기본 필터 폭을 넘지 않는지 확인한다.
- 목록에 시딩한 건수보다 적게 뜨면, 기본 필터 조건으로 직접 쿼리를 재현해 몇 건이 걸리는지부터 본다.

### 체크리스트

1. 화면의 검색 필터 store에서 기본 시작일 상수를 찾는다 (`DEFAULT_START_DATE = dayjs().subtract(N, 'day')`).
2. 목록 API가 날짜 조건을 무조건 적용하는지 확인한다 (`if (!isYmd(...)) return 400` 같은 강제 검증이 있으면 우회 경로가 없다는 뜻이다).
3. 시드 날짜 스프레드를 그 폭 안으로 제한하되 경계에 붙이지 말고 하루 이상 여유를 둔다.
4. 화면이 쓰는 정확한 조건(날짜 타입·범위·정렬·pageSize)으로 쿼리를 재현해 기대 건수·페이지 수를 확인한다.

## Examples

| 화면 | 필터 폭 | 시드 스프레드 (수정 전) | 결과 | 시드 스프레드 (수정 후) | 결과 |
|---|---|---|---|---|---|
| 상품목록 | 최근 7일 (`createDate`) | 2~52일 전 | 20건 중 **4건** | 6시간 간격 (최대 ~4.75일 전) | **20건 · 2페이지** |
| 연동상품 목록 | 최근 7일 (`lastSentAt`) | `daysAgo(0)` ~ `daysAgo(12)` | 12건 중 **8건** | 전부 `daysAgo(6)` 이하 | **12건 · 2페이지** |

## Related

- [`CLAUDE.md`](../../../CLAUDE.md) "시각 컬럼과 날짜 범위 필터" — `toKstDateRange()`로 KST 반개구간을 만드는 규칙. **직교하는 문제다.** 그 규칙은 비교 구현이 틀려서 유효한 행이 빠지는 것을 막고, 이 문서는 비교가 정확한데도 **시드 쪽 날짜가 창 밖에 있어** 빠지는 경우를 다룬다. 필터 구현이 규칙을 지켜도 이 증상은 그대로 난다.
- `src/features/products/store/search.store.ts` — 상품목록 기본 필터 상수
- `src/app/api/products/list/route.ts` — 우회 경로 없이 적용되는 날짜 조건
- `src/features/mallLinkedProduct/store/search.store.ts` — 연동상품 목록 기본 필터 상수
- `scripts/seedMallLinkedProducts.ts`(로컬 전용) — 지금의 연동상품 시드. 실제 전송 경로로 행을 만들어 `lastSentAt`이 실행 시점이다. 기본 7일 필터를 벗어나면 `--reset`으로 다시 돌린다 — 폭 문제는 없어졌지만 **시간이 지나면 창 밖으로 밀려나는** 같은 축의 함정은 남아 있다
