# 단건 조회 Ownership 검증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Order/Product/CollectionJob/ShoppingAccount/ShoppingSetting 5개 도메인의 단건 조회·수정·서브액션 엔드포인트에 `ownerId` 기반 테넌트 소유권 검증을 추가한다.

**Architecture:** 클라이언트는 `workspaceOwnerIdAtom` 값을 `X-Owner-Id` 헤더로 모든 단건 요청에 실어 보낸다. MSW 핸들러는 신규 공통 유틸 `isOwnerMatch(resourceOwnerId, requestOwnerId)`로 리소스의 `ownerId`와 헤더값을 비교해, 불일치·리소스 없음 모두 `404`로 응답한다.

**Tech Stack:** Next.js 15, MSW(mock handlers), TanStack Query, Jotai, Vitest

## Global Constraints

- 헤더 이름은 `X-Owner-Id`로 고정 (스펙 승인 사항).
- 실패 응답은 항상 `404`로 통일 — 다른 테넌트 리소스의 존재 여부를 노출하지 않기 위함(스펙 결정 사항).
- `order/collection/trigger`는 예외적으로 404를 반환하지 않는다 — `jobIds` 중 소유 job만 필터링해 트리거하고, 전부 다른 테넌트 소유여도 `200`과 `triggeredCount: 0`을 반환한다.
- 신규 훅/쿼리는 기존 `ShoppingAccount` 패턴과 동일하게 `enabled: !!workspaceOwnerId` 가드를 반드시 포함한다.
- Vitest 테스트 커버리지는 프로젝트 컨벤션상 `src/mocks/utils/`에 한정된다(CLAUDE.md). 핸들러/api 함수/UI 컴포넌트는 자동 테스트 대상이 아니므로, 각 태스크의 검증은 관련 유닛(있는 경우) + `npm run test` 전체 통과 + 개발 서버 수동 확인으로 진행한다.
- **커밋은 하지 않는다.** `git add`/`git commit` 등 모든 git 작업은 사용자가 명시적으로 요청할 때만 실행한다(CLAUDE.md Git/PR 규칙). 각 태스크의 마지막 스텝은 "작업 완료 확인"이며 git 명령을 포함하지 않는다.

---

### Task 1: 공통 소유권 검증 유틸 (`isOwnerMatch`)

**Files:**
- Create: `src/mocks/utils/verifyOwnership.ts`
- Test: `src/mocks/utils/verifyOwnership.test.ts`

**Interfaces:**
- Produces: `isOwnerMatch(resourceOwnerId: string, requestOwnerId: string | null): boolean` — 이후 모든 태스크(2~6)의 MSW 핸들러가 이 함수를 import해서 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/mocks/utils/verifyOwnership.test.ts
import { describe, it, expect } from 'vitest';
import { isOwnerMatch } from './verifyOwnership';

describe('isOwnerMatch', () => {
  it('resourceOwnerId와 requestOwnerId가 같으면 true를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_001')).toBe(true);
  });

  it('resourceOwnerId와 requestOwnerId가 다르면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', 'usr_002')).toBe(false);
  });

  it('requestOwnerId가 null이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', null)).toBe(false);
  });

  it('requestOwnerId가 빈 문자열이면 false를 반환한다', () => {
    expect(isOwnerMatch('usr_001', '')).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- verifyOwnership`
Expected: FAIL with "Cannot find module './verifyOwnership'" (또는 `isOwnerMatch is not a function`)

- [ ] **Step 3: 최소 구현**

```ts
// src/mocks/utils/verifyOwnership.ts
export const isOwnerMatch = (resourceOwnerId: string, requestOwnerId: string | null): boolean =>
  !!requestOwnerId && resourceOwnerId === requestOwnerId;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- verifyOwnership`
Expected: PASS (4 tests)

- [ ] **Step 5: 작업 완료 확인 (커밋 없음)**

---

### Task 2: Order 단건 조회/수정 + 하위 리소스

**Files:**
- Modify: `src/mocks/handlers/orders.ts`
- Modify: `src/features/order/api/getOrder.ts`
- Modify: `src/features/order/api/updateOrder.ts`
- Modify: `src/features/order/api/getOrderClaim.ts`
- Modify: `src/features/order/api/getOrderComments.ts`
- Modify: `src/features/order/api/getOrderHistory.ts`
- Modify: `src/features/order/api/createOrderComment.ts`
- Modify: `src/features/order/ui/detail/OrderDetailLayout.tsx`
- Modify: `src/features/order/ui/detail/OrderCommentSection.tsx`

**Interfaces:**
- Consumes: `isOwnerMatch` (Task 1)
- Produces: `getOrder(orderId, ownerId)`, `updateOrder(orderId, data, ownerId)`, `getOrderClaim(orderId, ownerId)`, `getOrderComments(orderId, ownerId)`, `getOrderHistory(orderId, ownerId)`, `createOrderComment(orderId, content, ownerId)` — 시그니처가 모두 `ownerId`를 마지막 인자로 받도록 변경됨. Task 5/6에서 참고할 표준 패턴.

- [ ] **Step 1: MSW 핸들러에 소유권 검증 추가**

`src/mocks/handlers/orders.ts` 전체를 다음으로 교체한다:

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Order, OrderDetail, OrderSearchType } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';
import { MOCK_ORDER_CLAIMS, MOCK_ORDER_COMMENTS, MOCK_ORDER_HISTORIES, MOCK_ORDER_DETAIL_EXTRAS } from '../data/MockOrderExtrasData';
import { getMockOrders } from '../utils/getOrders';
import { updateMockOrder } from '../utils/updateOrder';
import { addMockOrderComment } from '../utils/addOrderComment';
import { isOwnerMatch } from '../utils/verifyOwnership';

const findOwnedOrder = (orderId: string, ownerId: string | null) => {
  const order = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  return order && isOwnerMatch(order.ownerId, ownerId) ? order : null;
};

export const orderHandlers = [
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Omit<Order, 'ownerId'>[] };
    MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
    return HttpResponse.json({ success: true, count: orders.length });
  }),

  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    await delay(300);
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: OrderSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockOrders(ownerId, filters, page, pageSize));
  }),

  http.get(`${baseUrl}/api/orders/:orderId`, ({ params, request }) => {
    const { orderId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
    if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const extras = MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {};
    const order: OrderDetail = { ...base, ...extras };
    return HttpResponse.json(order);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/claim`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const claim = MOCK_ORDER_CLAIMS[params.orderId as string] ?? null;
    return HttpResponse.json(claim);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/comments`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const comments = MOCK_ORDER_COMMENTS[params.orderId as string] ?? [];
    return HttpResponse.json(comments);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/history`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const history = MOCK_ORDER_HISTORIES[params.orderId as string] ?? [];
    return HttpResponse.json(history);
  }),

  http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
    await delay(300);
    const { orderId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
    if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const update = (await request.json()) as Partial<OrderDetail>;
    const updated = updateMockOrder(orderId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const { content } = (await request.json()) as { content: string };
    const newComment = addMockOrderComment(params.orderId as string, content);
    return HttpResponse.json(newComment);
  }),
];
```

- [ ] **Step 2: api 함수에 `ownerId` 파라미터 + 헤더 추가**

`src/features/order/api/getOrder.ts`:

```ts
import { OrderDetail } from '../types/order.types';

export const getOrder = async (orderId: string, ownerId: string): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('주문 조회 실패');
  return response.json();
};
```

`src/features/order/api/updateOrder.ts`:

```ts
import { OrderDetail } from '../types/order.types';

export const updateOrder = async (
  orderId: string,
  data: Partial<OrderDetail>,
  ownerId: string,
): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('주문 수정 실패');
  return response.json();
};
```

`src/features/order/api/getOrderClaim.ts`:

```ts
import { OrderClaim } from '../types/order.types';

export const getOrderClaim = async (orderId: string, ownerId: string): Promise<OrderClaim | null> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/claim`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('클레임 조회 실패');
  return response.json();
};
```

`src/features/order/api/getOrderComments.ts`:

```ts
import { OrderComment } from '../types/order.types';

export const getOrderComments = async (orderId: string, ownerId: string): Promise<OrderComment[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('코멘트 조회 실패');
  return response.json();
};
```

`src/features/order/api/getOrderHistory.ts`:

```ts
import { OrderEditHistory } from '../types/order.types';

export const getOrderHistory = async (orderId: string, ownerId: string): Promise<OrderEditHistory[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/history`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('수정이력 조회 실패');
  return response.json();
};
```

`src/features/order/api/createOrderComment.ts`:

```ts
import { OrderComment } from '../types/order.types';

export const createOrderComment = async (
  orderId: string,
  content: string,
  ownerId: string,
): Promise<OrderComment> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('코멘트 저장 실패');
  return response.json();
};
```

- [ ] **Step 3: 호출부(`OrderDetailLayout.tsx`, `OrderCommentSection.tsx`)에서 `workspaceOwnerIdAtom` 스레딩**

`src/features/order/ui/detail/OrderDetailLayout.tsx` 전체를 다음으로 교체한다:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { FormProvider, useForm } from 'react-hook-form';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getOrder } from '../../api/getOrder';
import { getOrderClaim } from '../../api/getOrderClaim';
import { getOrderComments } from '../../api/getOrderComments';
import { getOrderHistory } from '../../api/getOrderHistory';
import { updateOrder } from '../../api/updateOrder';
import { OrderDetail } from '../../types/order.types';
import { OrderInfoSection } from './OrderInfoSection';
import { OrdererRecipientSection } from './OrdererRecipientSection';
import { OrderStatusSection } from './OrderStatusSection';
import { OrderClaimSection } from './OrderClaimSection';
import { OrderCommentSection } from './OrderCommentSection';
import { OrderEditHistorySection } from './OrderEditHistorySection';

type Props = {
  orderId: string;
};

export const OrderDetailLayout = ({ orderId }: Props) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const form = useForm<OrderDetail>();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: order, isSuccess: orderSuccess } = useQuery({
    queryKey: ['order', orderId, workspaceOwnerId],
    queryFn: () => getOrder(orderId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { data: claim, isSuccess: claimSuccess } = useQuery({
    queryKey: ['order-claim', orderId, workspaceOwnerId],
    queryFn: () => getOrderClaim(orderId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['order-comments', orderId, workspaceOwnerId],
    queryFn: () => getOrderComments(orderId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', orderId, workspaceOwnerId],
    queryFn: () => getOrderHistory(orderId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  useEffect(() => {
    if (orderSuccess && order) {
      form.reset({ ...order, claim: claim ?? undefined });
    }
  }, [orderSuccess, claimSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: saveOrder, isPending } = useMutation({
    mutationFn: (data: OrderDetail) => updateOrder(orderId, data, workspaceOwnerId),
    onSuccess: (updatedOrder) => {
      form.reset({ ...updatedOrder, claim: claim ?? undefined });
      queryClient.setQueryData(['order', orderId, workspaceOwnerId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['order-history', orderId, workspaceOwnerId] });
      setIsEditMode(false);
      showAlert({ type: 'success', message: '주문 수정 완료' });
    },
    onError: () => {
      showAlert({ type: 'error', message: '주문 수정 실패' });
    },
  });

  const handleCancel = () => {
    if (order) form.reset({ ...order, claim: claim ?? undefined });
    setIsEditMode(false);
  };

  if (!order) return null;

  return (
    <>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit((data) => saveOrder(data))} className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">주문 상세</h1>
              <p className="text-muted-foreground">{order.orderNumber}</p>
            </div>
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button variant="outline" type="button" onClick={handleCancel}>
                    취소
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    저장
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => setIsEditMode(true)}>
                  수정
                </Button>
              )}
            </div>
          </div>

          <OrderInfoSection order={order} isEditMode={isEditMode} />
          <OrdererRecipientSection order={order} isEditMode={isEditMode} />
          <OrderStatusSection order={order} isEditMode={isEditMode} />
          <OrderClaimSection claim={claim} isEditMode={isEditMode} />
        </form>
      </FormProvider>

      <div className="space-y-6 mt-6">
        <OrderCommentSection orderId={orderId} comments={comments} ownerId={workspaceOwnerId} />
        <OrderEditHistorySection editHistory={history} />
      </div>
    </>
  );
};
```

`src/features/order/ui/detail/OrderCommentSection.tsx` 전체를 다음으로 교체한다:

```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OrderComment } from '../../types/order.types';
import { createOrderComment } from '../../api/createOrderComment';

type Props = {
  orderId: string;
  comments: OrderComment[];
  ownerId: string;
};

export const OrderCommentSection = ({ orderId, comments, ownerId }: Props) => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => createOrderComment(orderId, content, ownerId),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['order-comments', orderId, ownerId] });
    },
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">주문 코멘트</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">작성된 코멘트가 없습니다.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                  <span className="text-xs font-medium">{comment.authorName}</span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="코멘트를 입력하세요"
            className="resize-none flex-1"
            rows={2}
          />
          <Button
            type="button"
            onClick={() => mutate()}
            disabled={!content.trim() || isPending}
          >
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 4: 전체 테스트 + 수동 확인**

Run: `npm run test`
Expected: 기존 87개 + Task 1의 4개 = 91개 전부 PASS

Run: `npm run dev` 후 브라우저에서 로그인 → `order/list`에서 임의의 주문 클릭 → 상세 페이지가 정상 로드되는지, 클레임/코멘트/이력 섹션이 정상 표시되는지, 코멘트 작성 및 주문 수정 저장이 정상 동작하는지 확인.

- [ ] **Step 5: 작업 완료 확인 (커밋 없음)**

---

### Task 3: Order/Collection — `order/collection/trigger` 필터링

**Files:**
- Modify: `src/mocks/handlers/collection.ts`
- Modify: `src/features/order/api/triggerOrderCollection.ts`
- Modify: `src/features/order/api/useTriggerOrderCollection.ts`

**Interfaces:**
- Consumes: `isOwnerMatch` (Task 1)
- Produces: `triggerOrderCollection(jobIds, ownerId)` — Task 2의 `updateOrder` 등과 동일하게 `ownerId`를 마지막 인자로 받는 패턴 유지.

- [ ] **Step 1: 핸들러에 필터링 로직 추가**

`src/mocks/handlers/collection.ts` 전체를 다음으로 교체한다:

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { CollectionSearchParams, TriggerCollectionBody } from '@/features/order/types/collection.types';
import { getCollectionJobsMock } from '../utils/getCollectionJobs';
import { triggerOrderCollectionMock } from '../utils/triggerOrderCollection';
import { MOCK_COLLECTION_JOBS } from '../data/MockCollectionJobsData';
import { isOwnerMatch } from '../utils/verifyOwnership';
import { ShoppingMalls } from '@/types/common.type';

export const collectionHandlers = [
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId') ?? '';
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: (url.searchParams.get('mallCode') ?? 'ALL') as ShoppingMalls | 'ALL',
      mallId: url.searchParams.get('mallId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(ownerId, params));
  }),

  http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
    await delay(300);
    const ownerId = request.headers.get('X-Owner-Id');
    const { jobIds } = (await request.json()) as TriggerCollectionBody;
    const ownedJobIds = MOCK_COLLECTION_JOBS.filter(
      (job) => jobIds.includes(job.id) && isOwnerMatch(job.ownerId, ownerId),
    ).map((job) => job.id);
    const triggeredCount = triggerOrderCollectionMock(ownedJobIds);
    return HttpResponse.json({ success: true, triggeredCount });
  }),
];
```

- [ ] **Step 2: api 함수 + 훅에 `ownerId` 추가**

`src/features/order/api/triggerOrderCollection.ts`:

```ts
// src/features/order/api/triggerOrderCollection.ts
import { TriggerCollectionBody } from '../types/collection.types';

export async function triggerOrderCollection(
  jobIds: string[],
  ownerId: string,
): Promise<{ success: boolean; triggeredCount: number }> {
  const body: TriggerCollectionBody = { jobIds };
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('주문수집 실행 실패');
  return response.json();
}
```

`src/features/order/api/useTriggerOrderCollection.ts`:

```ts
// src/features/order/api/useTriggerOrderCollection.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { triggerOrderCollection } from './triggerOrderCollection';
import { COLLECTION_JOBS_QUERY_KEY } from './useGetCollectionJobs';

export const useTriggerOrderCollection = () => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (jobIds: string[]) => triggerOrderCollection(jobIds, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COLLECTION_JOBS_QUERY_KEY] });
    },
  });
};
```

- [ ] **Step 3: 전체 테스트 + 수동 확인**

Run: `npm run test`
Expected: 전부 PASS (신규 테스트 없음, 회귀 없음 확인)

Run: `npm run dev` 후 `order/list` 상단의 주문수집 화면에서 job을 선택해 수집 실행 버튼을 눌러 `triggeredCount`가 정상 반환되는지 확인.

- [ ] **Step 4: 작업 완료 확인 (커밋 없음)**

---

### Task 4: Product 단건 조회/수정

**Files:**
- Modify: `src/mocks/handlers/products.ts`
- Modify: `src/features/products/api/getProduct.ts`
- Modify: `src/features/products/api/updateProduct.ts`
- Modify: `src/features/products/ui/[id]/ProductModifyLayout.tsx`

**Interfaces:**
- Consumes: `isOwnerMatch` (Task 1)
- Produces: `getProduct(productId, ownerId)`, `updateProduct(productId, data, ownerId)`

- [ ] **Step 1: 핸들러에 소유권 검증 추가**

`src/mocks/handlers/products.ts` 전체를 다음으로 교체한다:

```ts
import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { getMockProducts } from '../utils/getProducts';
import { createMockProduct } from '../utils/createProduct';
import { updateMockProduct } from '../utils/updateProduct';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { isOwnerMatch } from '../utils/verifyOwnership';

export const productHandlers = [
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const { ownerId, ...searchParams } = (await request.json()) as ProductSearch & { ownerId: string };
    return HttpResponse.json(getMockProducts(ownerId, searchParams));
  }),

  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const { ownerId, ...data } = (await request.json()) as Product & { ownerId: string };
    const newProduct = createMockProduct({ ...data, ownerId });
    MOCK_PRODUCT_DATA.push(newProduct);
    return HttpResponse.json(newProduct);
  }),

  http.get(`${baseUrl}/api/products/:productId`, ({ params, request }) => {
    const { productId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(data);
  }),

  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const update = (await request.json()) as Product;
    const updated = updateMockProduct(productId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, products } = (await request.json()) as { ownerId: string; products: Omit<Product, 'ownerId'>[] };
    MOCK_PRODUCT_DATA.push(...products.map((p) => ({ ...p, ownerId })));
    return HttpResponse.json({ success: true, count: products.length });
  }),
];
```

- [ ] **Step 2: api 함수에 `ownerId` 파라미터 + 헤더 추가**

`src/features/products/api/getProduct.ts`:

```ts
export const getProduct = async (productId: string, ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
    headers: { 'X-Owner-Id': ownerId },
  });

  if (!response.ok) {
    throw new Error('상품 데이터 호출 실패');
  }

  return response.json();
};
```

`src/features/products/api/updateProduct.ts`:

```ts
import { Product } from '../types/product.types';

export const updateProduct = async (productId: string, data: Product, ownerId: string) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'X-Owner-Id': ownerId },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('상품 데이터 호출 실패');
  }

  return response.json();
};
```

- [ ] **Step 3: 호출부(`ProductModifyLayout.tsx`)에서 `workspaceOwnerIdAtom` 스레딩**

`src/features/products/ui/[id]/ProductModifyLayout.tsx` 전체를 다음으로 교체한다:

```tsx
'use client';

import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { ProductForm } from '../components/ProductForm';
import { Product } from '../../types/product.types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getProduct } from '../../api/getProduct';
import { updateProduct } from '../../api/updateProduct';
import { useEffect } from 'react';
import { useAlert } from '@/hooks/useAlert';
import { useRouter } from 'next/navigation';

type Props = {
  productId: string;
};

export const ProductModifyLayout = ({ productId }: Props) => {
  const router = useRouter();

  const formData = useForm<Product>();
  const { showAlert } = useAlert();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  const { data: queryData, isSuccess } = useQuery({
    queryKey: ['productId', productId, workspaceOwnerId],
    queryFn: () => getProduct(productId, workspaceOwnerId),
    enabled: !!workspaceOwnerId,
  });

  const { mutate } = useMutation({
    mutationFn: (data: Product) => updateProduct(productId, data, workspaceOwnerId),
    onSuccess: () => {
      showAlert({
        type: 'success',
        message: '상품수정 완료',
        onConfirm: () => {
          router.push('/products/list');
        },
      });
    },
    onError: () => {
      showAlert({
        type: 'error',
        message: '상품수정 실패',
      });
    },
  });

  useEffect(() => {
    if (isSuccess && queryData) {
      console.log('상품정보', queryData);
      formData.reset(queryData);
    }
  }, [isSuccess, queryData]);

  const onSubmit: SubmitHandler<Product> = (data) => {
    mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">상품 수정</h1>
          <p className="text-muted-foreground">상품을 수정하세요.</p>
        </div>
      </div>
      {formData && (
        <FormProvider {...formData}>
          <form onSubmit={formData.handleSubmit(onSubmit)} className="space-y-6">
            <ProductForm />
          </form>
        </FormProvider>
      )}
    </div>
  );
};
```

- [ ] **Step 4: 전체 테스트 + 수동 확인**

Run: `npm run test`
Expected: 전부 PASS

Run: `npm run dev` 후 `products/list`에서 임의의 상품을 클릭해 수정 페이지 진입 → 데이터가 정상 로드되고 저장이 정상 동작하는지 확인.

- [ ] **Step 5: 작업 완료 확인 (커밋 없음)**

---

### Task 5: ShoppingAccount 단건 조회/수정

**Files:**
- Modify: `src/mocks/handlers/shoppingAccounts.ts`
- Modify: `src/features/shoppingAccount/api/getShoppingAccount.ts`
- Modify: `src/features/shoppingAccount/api/updateShoppingAccount.ts`
- Modify: `src/features/shoppingAccount/api/useGetShoppingAccount.ts`
- Modify: `src/features/shoppingAccount/api/useUpdateShoppingAccount.ts`

**Interfaces:**
- Consumes: `isOwnerMatch` (Task 1)
- Produces: `getShoppingAccount(id, ownerId)`, `updateShoppingAccount(id, body, ownerId)`

- [ ] **Step 1: 핸들러에 소유권 검증 추가**

`src/mocks/handlers/shoppingAccounts.ts` 전체를 다음으로 교체한다:

```ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import {
  ShoppingAccountSearchType,
  CreateShoppingAccountBody,
  UpdateShoppingAccountBody,
} from '@/features/shoppingAccount/types/shoppingAccount.types';
import { getMockShoppingAccounts } from '../utils/getShoppingAccounts';
import { getMockShoppingAccount } from '../utils/getShoppingAccount';
import { createMockShoppingAccount } from '../utils/createShoppingAccount';
import { updateMockShoppingAccount } from '../utils/updateShoppingAccount';
import { deleteMockShoppingAccounts } from '../utils/deleteShoppingAccounts';
import { updateMockShoppingAccountsStatus } from '../utils/updateShoppingAccountsStatus';
import { getMockShoppingAccountsByMall } from '../utils/getShoppingAccountsByMall';
import { isOwnerMatch } from '../utils/verifyOwnership';
import { ShoppingMalls } from '@/types/common.type';

export const shoppingAccountHandlers = [
  http.post(`${baseUrl}/api/shopping/accounts/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingAccountSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingAccounts(ownerId, filters, page, pageSize));
  }),

  http.post(`${baseUrl}/api/shopping/accounts/by-mall`, async ({ request }) => {
    const { ownerId, mallCode } = (await request.json()) as { ownerId: string; mallCode: ShoppingMalls };
    return HttpResponse.json(getMockShoppingAccountsByMall(ownerId, mallCode));
  }),

  http.post(`${baseUrl}/api/shopping/accounts`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingAccountBody & { ownerId: string };
    const newAccount = createMockShoppingAccount(body, ownerId);
    return HttpResponse.json(newAccount, { status: 201 });
  }),

  http.post(`${baseUrl}/api/shopping/accounts/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingAccounts(ids);
    return HttpResponse.json({ success: true });
  }),

  // status 핸들러는 :id 핸들러보다 먼저 등록해야 경로 충돌 방지
  http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingAccountsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),

  http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const existing = getMockShoppingAccount(params.id as string);
    if (!existing || !isOwnerMatch(existing.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as UpdateShoppingAccountBody;
    const updated = updateMockShoppingAccount(params.id as string, body);
    return HttpResponse.json(updated);
  }),

  http.get(`${baseUrl}/api/shopping/accounts/:id`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const account = getMockShoppingAccount(params.id as string);
    if (!account || !isOwnerMatch(account.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(account);
  }),
];
```

- [ ] **Step 2: api 함수에 `ownerId` 파라미터 + 헤더 추가**

`src/features/shoppingAccount/api/getShoppingAccount.ts`:

```ts
import { ShoppingAccount } from '../types/shoppingAccount.types';

export const getShoppingAccount = async (id: string, ownerId: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 조회 실패');
  return response.json();
};
```

`src/features/shoppingAccount/api/updateShoppingAccount.ts`:

```ts
import { ShoppingAccount, UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const updateShoppingAccount = async (
  id: string,
  body: UpdateShoppingAccountBody,
  ownerId: string,
): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 수정 실패');
  return response.json();
};
```

- [ ] **Step 3: 훅에서 `workspaceOwnerIdAtom` 스레딩 (컴포넌트는 변경 없음)**

`src/features/shoppingAccount/api/useGetShoppingAccount.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingAccount } from './getShoppingAccount';

export const SHOPPING_ACCOUNT_QUERY_KEY = 'shoppingAccount';

export const useGetShoppingAccount = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getShoppingAccount(id, workspaceOwnerId),
    enabled: !!id && !!workspaceOwnerId,
  });
};
```

`src/features/shoppingAccount/api/useUpdateShoppingAccount.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingAccount } from './updateShoppingAccount';
import { SHOPPING_ACCOUNT_LIST_QUERY_KEY } from './useGetShoppingAccounts';
import { SHOPPING_ACCOUNT_QUERY_KEY } from './useGetShoppingAccount';
import { UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const useUpdateShoppingAccount = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingAccountBody) => updateShoppingAccount(id, body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_ACCOUNT_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
```

- [ ] **Step 4: 전체 테스트 + 수동 확인**

Run: `npm run test`
Expected: 전부 PASS

Run: `npm run dev` 후 쇼핑몰 계정관리에서 임의의 계정을 열어 상세 조회 및 수정이 정상 동작하는지 확인.

- [ ] **Step 5: 작업 완료 확인 (커밋 없음)**

---

### Task 6: ShoppingSetting 단건 조회/수정

**Files:**
- Modify: `src/mocks/handlers/shoppingSettings.ts`
- Modify: `src/features/shoppingSetting/api/getShoppingSetting.ts`
- Modify: `src/features/shoppingSetting/api/updateShoppingSetting.ts`
- Modify: `src/features/shoppingSetting/api/useGetShoppingSetting.ts`
- Modify: `src/features/shoppingSetting/api/useUpdateShoppingSetting.ts`

**Interfaces:**
- Consumes: `isOwnerMatch` (Task 1)
- Produces: `getShoppingSetting(id, ownerId)`, `updateShoppingSetting(id, body, ownerId)`

- [ ] **Step 1: 핸들러에 소유권 검증 추가**

`src/mocks/handlers/shoppingSettings.ts` 전체를 다음으로 교체한다:

```ts
import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import {
  ShoppingSettingSearchType,
  CreateShoppingSettingBody,
  UpdateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { getMockShoppingSettings } from '../utils/getShoppingSettings';
import { updateMockShoppingSettingsStatus } from '../utils/updateShoppingSettingsStatus';
import { deleteMockShoppingSettings } from '../utils/deleteShoppingSettings';
import { getMockAvailableMallAccounts } from '../utils/getAvailableMallAccounts';
import { ShoppingMalls } from '@/types/common.type';
import { getMockAddressBook } from '../utils/getAddressBook';
import { getMockShoppingSetting } from '../utils/getShoppingSetting';
import { createMockShoppingSetting } from '../utils/createShoppingSetting';
import { updateMockShoppingSetting } from '../utils/updateShoppingSetting';
import { isOwnerMatch } from '../utils/verifyOwnership';

export const shoppingSettingHandlers = [
  http.post(`${baseUrl}/api/shopping/settings/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingSettingSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingSettings(ownerId, filters, page, pageSize));
  }),

  http.patch(`${baseUrl}/api/shopping/settings/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingSettingsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingSettings(ids);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/available-accounts`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockAvailableMallAccounts(ownerId));
  }),

  http.post(`${baseUrl}/api/shopping/settings/addresses`, async ({ request }) => {
    const { mallCode } = (await request.json()) as { mallCode: ShoppingMalls; mallId: string };
    return HttpResponse.json(getMockAddressBook(mallCode));
  }),

  http.post(`${baseUrl}/api/shopping/settings`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingSettingBody & { ownerId: string };
    return HttpResponse.json(createMockShoppingSetting(body, ownerId), { status: 201 });
  }),

  // status/addresses 등 고정경로를 모두 등록한 뒤 동적경로(/:id)를 등록 - :id가 고정 세그먼트와 매칭되는 것을 방지
  http.get(`${baseUrl}/api/shopping/settings/:id`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const setting = getMockShoppingSetting(params.id as string);
    if (!setting || !isOwnerMatch(setting.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(setting);
  }),

  http.patch(`${baseUrl}/api/shopping/settings/:id`, async ({ request, params }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const existing = getMockShoppingSetting(params.id as string);
    if (!existing || !isOwnerMatch(existing.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as UpdateShoppingSettingBody;
    const updated = updateMockShoppingSetting(params.id as string, body);
    return HttpResponse.json(updated);
  }),
];
```

- [ ] **Step 2: api 함수에 `ownerId` 파라미터 + 헤더 추가**

`src/features/shoppingSetting/api/getShoppingSetting.ts`:

```ts
import { ShoppingSetting } from '../types/shoppingSetting.types';

export const getShoppingSetting = async (id: string, ownerId: string): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 조회 실패');
  return response.json();
};
```

`src/features/shoppingSetting/api/updateShoppingSetting.ts`:

```ts
import { ShoppingSetting, UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const updateShoppingSetting = async (
  id: string,
  body: UpdateShoppingSettingBody,
  ownerId: string,
): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 수정 실패');
  return response.json();
};
```

- [ ] **Step 3: 훅에서 `workspaceOwnerIdAtom` 스레딩 (컴포넌트는 변경 없음)**

`src/features/shoppingSetting/api/useGetShoppingSetting.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { getShoppingSetting } from './getShoppingSetting';

export const SHOPPING_SETTING_QUERY_KEY = 'shoppingSetting';

export const useGetShoppingSetting = (id: string) => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useQuery({
    queryKey: [SHOPPING_SETTING_QUERY_KEY, id, workspaceOwnerId],
    queryFn: () => getShoppingSetting(id, workspaceOwnerId),
    enabled: !!id && !!workspaceOwnerId,
  });
};
```

`src/features/shoppingSetting/api/useUpdateShoppingSetting.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { updateShoppingSetting } from './updateShoppingSetting';
import { SHOPPING_SETTING_LIST_QUERY_KEY } from './useGetShoppingSettings';
import { SHOPPING_SETTING_QUERY_KEY } from './useGetShoppingSetting';
import { UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const useUpdateShoppingSetting = (id: string) => {
  const queryClient = useQueryClient();
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: UpdateShoppingSettingBody) => updateShoppingSetting(id, body, workspaceOwnerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHOPPING_SETTING_QUERY_KEY, id, workspaceOwnerId] });
    },
  });
};
```

- [ ] **Step 4: 전체 테스트 + 수동 확인**

Run: `npm run test`
Expected: 전부 PASS

Run: `npm run dev` 후 쇼핑몰 정보설정에서 임의의 설정을 열어 상세 조회 및 수정이 정상 동작하는지 확인.

- [ ] **Step 5: 작업 완료 확인 (커밋 없음)**

---

## 최종 확인

모든 태스크 완료 후:

- [ ] `npm run test` 전체 통과 (Task 1에서 추가된 4개 테스트 포함, 총 91개)
- [ ] `npm run lint` 통과
- [ ] `npm run build` 통과
- [ ] 개발 서버에서 8개 대상 엔드포인트를 사용하는 화면(주문 상세, 주문수집, 상품 수정, 쇼핑몰 계정 수정, 쇼핑몰 정보설정 수정) 전부 수동 확인 완료
