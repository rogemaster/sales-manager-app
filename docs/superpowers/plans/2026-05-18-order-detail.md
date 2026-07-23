# 주문 상세 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/order/[id]` 주문 상세 페이지 구현 — 조회/인라인 수정 모드, 코멘트 작성, 수정이력, 다음 우편번호 API 연동

**Architecture:** `OrderDetailLayout`이 `useQuery`로 데이터를 받아 `FormProvider`로 하위 섹션에 공유한다. 수정 모드는 로컬 `useState`로 관리하며, 저장 시 `useMutation`으로 서버에 반영한다. MSW가 개발 환경에서 API를 mock한다.

**Tech Stack:** Next.js 15 App Router, React Hook Form, TanStack Query, MSW, Tailwind CSS, shadcn/ui

---

## 파일 목록

| 작업 | 파일 경로 |
|------|-----------|
| 수정 | `src/features/order/types/order.types.ts` |
| 생성 | `src/mocks/data/MockOrderDetailData.ts` |
| 수정 | `src/mocks/handlers.ts` |
| 생성 | `src/features/order/api/getOrder.ts` |
| 생성 | `src/features/order/api/updateOrder.ts` |
| 생성 | `src/features/order/api/createOrderComment.ts` |
| 생성 | `src/hooks/useDaumPostcode.ts` |
| 생성 | `src/features/order/ui/detail/OrderInfoSection.tsx` |
| 생성 | `src/features/order/ui/detail/OrdererRecipientSection.tsx` |
| 생성 | `src/features/order/ui/detail/OrderStatusSection.tsx` |
| 생성 | `src/features/order/ui/detail/OrderClaimSection.tsx` |
| 생성 | `src/features/order/ui/detail/OrderCommentSection.tsx` |
| 생성 | `src/features/order/ui/detail/OrderEditHistorySection.tsx` |
| 생성 | `src/features/order/ui/detail/OrderDetailLayout.tsx` |
| 생성 | `src/features/order/ui/detail/index.ts` |
| 생성 | `src/app/(authenticated)/order/[id]/page.tsx` |
| 수정 | `src/features/order/ui/list/components/orderTable/OrderListTable.tsx` |

---

## Task 1: 타입 확장

**Files:**
- Modify: `src/features/order/types/order.types.ts`

- [ ] **Step 1: `order.types.ts` 에 아래 인터페이스를 추가한다**

파일 하단에 추가:

```typescript
export interface OrderDetail extends Order {
  orderDetailAddress?: string;
  payeeDetailAddress?: string;
  claim?: OrderClaim;
  comments: OrderComment[];
  editHistory: OrderEditHistory[];
}

export interface OrderClaim {
  claimType: 'CANCEL' | 'EXCHANGE' | 'RETURN';
  claimMessage: string;
  handlerNote?: string;
}

export interface OrderComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface OrderEditHistory {
  id: string;
  modifiedAt: string;
  modifiedBy: string;
  changedFields: string[];
}
```

- [ ] **Step 2: 빌드 에러가 없는지 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/order/types/order.types.ts
git commit -m "feat(order): OrderDetail, OrderClaim, OrderComment, OrderEditHistory 타입 추가"
```

---

## Task 2: MSW 목 데이터 추가

**Files:**
- Create: `src/mocks/data/MockOrderDetailData.ts`

- [ ] **Step 1: 파일 생성**

```typescript
import { OrderDetail } from '@/features/order/types/order.types';

export const MOCK_ORDER_DETAIL_DATA: OrderDetail[] = [
  {
    orderNumber: 'order_sample_001',
    shopOrderNumber: '111111-222222',
    orderStatus: 'NEW_ORDER',
    paymentDate: '2026-01-01',
    orderCollectionDate: '2026-01-02',
    shoppingMallName: 'GMK',
    shoppingMallId: 'gadmin1111',
    shopProductId: 'G-111223344',
    orderProductName: '쇼핑몰 상품명11 입니다.',
    orderOption: '',
    orderPrice: 120000,
    orderTotalQuantity: 2,
    orderDeliveryType: 'FREE',
    orderDeliveryPrice: 0,
    orderName: '주문자1',
    payeeName: '수취자1',
    orderPhoneNumber: '01012345678',
    payeePhoneNumber: '01012345678',
    orderZipCode: '06236',
    orderAddress: '서울특별시 강남구 테헤란로 123',
    orderDetailAddress: '101동 202호',
    payeeZipCode: '06236',
    payeeAddress: '서울특별시 강남구 테헤란로 123',
    payeeDetailAddress: '101동 202호',
    deliveryMessage: '문 앞에 놔주세요',
    claim: {
      claimType: 'RETURN',
      claimMessage: '단순 변심으로 인한 반품 요청입니다.',
      handlerNote: '반품 접수 완료, 수거 예정',
    },
    comments: [
      {
        id: 'comment_001',
        content: '배송지 변경 요청 확인했습니다.',
        authorName: '홍길동',
        createdAt: '2026-01-03 09:30',
      },
      {
        id: 'comment_002',
        content: '고객 연락 완료. 수거 일정 협의 중.',
        authorName: '김담당',
        createdAt: '2026-01-04 14:15',
      },
    ],
    editHistory: [
      {
        id: 'history_001',
        modifiedAt: '2026-01-03 10:00',
        modifiedBy: '홍길동',
        changedFields: ['payeeName', 'payeeAddress'],
      },
      {
        id: 'history_002',
        modifiedAt: '2026-01-05 16:20',
        modifiedBy: '김담당',
        changedFields: ['orderStatus', 'claim.handlerNote'],
      },
    ],
  },
  {
    orderNumber: 'order_sample_002',
    shopOrderNumber: '222222-333333',
    orderStatus: 'CONFIRMED_ORDER',
    paymentDate: '2026-01-06',
    orderCollectionDate: '2026-01-07',
    shoppingMallName: '11ST',
    shoppingMallId: 'elevenst_admin',
    shopProductId: 'E-223344556',
    orderProductName: '11번가 베스트셀러 상품A',
    orderOption: '색상:레드 / 사이즈:L',
    orderPrice: 45000,
    orderTotalQuantity: 1,
    orderDeliveryType: 'PAID',
    orderDeliveryPrice: 3000,
    orderName: '김철수',
    payeeName: '김철수',
    orderPhoneNumber: '01023456789',
    payeePhoneNumber: '01023456789',
    orderZipCode: '06236',
    orderAddress: '서울특별시 강남구 테헤란로 123',
    payeeZipCode: '06236',
    payeeAddress: '서울특별시 강남구 테헤란로 123',
    deliveryMessage: '문 앞에 놔주세요',
    comments: [],
    editHistory: [
      {
        id: 'history_003',
        modifiedAt: '2026-01-08 11:00',
        modifiedBy: '이관리',
        changedFields: ['orderStatus'],
      },
    ],
  },
];
```

- [ ] **Step 2: 커밋**

```bash
git add src/mocks/data/MockOrderDetailData.ts
git commit -m "feat(order): 주문 상세 MSW 목 데이터 추가"
```

---

## Task 3: MSW 핸들러 추가

**Files:**
- Modify: `src/mocks/handlers.ts`

- [ ] **Step 1: `handlers.ts` 상단 import에 추가**

기존 import 아래에 추가:

```typescript
import { MOCK_ORDER_DETAIL_DATA } from './data/MockOrderDetailData';
import { OrderDetail, OrderComment, OrderEditHistory } from '@/features/order/types/order.types';
```

- [ ] **Step 2: handlers 배열 끝에 핸들러 3개 추가**

`handlers` 배열 마지막 항목 뒤에 추가:

```typescript
  // 주문 단건 조회
  http.get(`${baseUrl}/api/orders/:orderId`, ({ params }) => {
    const { orderId } = params;
    const order = MOCK_ORDER_DETAIL_DATA.find((item) => item.orderNumber === orderId);
    if (!order) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(order);
  }),

  // 주문 수정
  http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
    const { orderId } = params;
    const update = (await request.json()) as Partial<OrderDetail>;
    const findIndex = MOCK_ORDER_DETAIL_DATA.findIndex((item) => item.orderNumber === orderId);

    if (findIndex === -1) return new HttpResponse(null, { status: 404 });

    const changedFields = Object.keys(update).filter(
      (key) => JSON.stringify(update[key as keyof OrderDetail]) !== JSON.stringify(MOCK_ORDER_DETAIL_DATA[findIndex][key as keyof OrderDetail]),
    );

    const newHistory: OrderEditHistory = {
      id: `history_${Date.now()}`,
      modifiedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\. /g, '-').replace('.', ''),
      modifiedBy: '담당자',
      changedFields,
    };

    MOCK_ORDER_DETAIL_DATA[findIndex] = {
      ...MOCK_ORDER_DETAIL_DATA[findIndex],
      ...update,
      editHistory: [...MOCK_ORDER_DETAIL_DATA[findIndex].editHistory, newHistory],
    };

    return HttpResponse.json(MOCK_ORDER_DETAIL_DATA[findIndex]);
  }),

  // 주문 코멘트 추가
  http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
    const { orderId } = params;
    const { content } = (await request.json()) as { content: string };
    const findIndex = MOCK_ORDER_DETAIL_DATA.findIndex((item) => item.orderNumber === orderId);

    if (findIndex === -1) return new HttpResponse(null, { status: 404 });

    const newComment: OrderComment = {
      id: `comment_${Date.now()}`,
      content,
      authorName: '담당자',
      createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }).replace(/\. /g, '-').replace('.', ''),
    };

    MOCK_ORDER_DETAIL_DATA[findIndex].comments.push(newComment);

    return HttpResponse.json(newComment);
  }),
```

- [ ] **Step 3: 커밋**

```bash
git add src/mocks/handlers.ts src/mocks/data/MockOrderDetailData.ts
git commit -m "feat(order): 주문 단건 조회/수정/코멘트 추가 MSW 핸들러 구현"
```

---

## Task 4: API 함수 작성

**Files:**
- Create: `src/features/order/api/getOrder.ts`
- Create: `src/features/order/api/updateOrder.ts`
- Create: `src/features/order/api/createOrderComment.ts`

- [ ] **Step 1: `getOrder.ts` 생성**

```typescript
import { OrderDetail } from '../types/order.types';

export const getOrder = async (orderId: string): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`);
  if (!response.ok) throw new Error('주문 조회 실패');
  return response.json();
};
```

- [ ] **Step 2: `updateOrder.ts` 생성**

```typescript
import { OrderDetail } from '../types/order.types';

export const updateOrder = async (orderId: string, data: Partial<OrderDetail>): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('주문 수정 실패');
  return response.json();
};
```

- [ ] **Step 3: `createOrderComment.ts` 생성**

```typescript
import { OrderComment } from '../types/order.types';

export const createOrderComment = async (orderId: string, content: string): Promise<OrderComment> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error('코멘트 저장 실패');
  return response.json();
};
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/order/api/getOrder.ts src/features/order/api/updateOrder.ts src/features/order/api/createOrderComment.ts
git commit -m "feat(order): 주문 단건 조회/수정/코멘트 API 함수 구현"
```

---

## Task 5: useDaumPostcode 훅

**Files:**
- Create: `src/hooks/useDaumPostcode.ts`

- [ ] **Step 1: 파일 생성**

```typescript
import { useCallback } from 'react';

interface DaumPostcodeData {
  zonecode: string;
  address: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void };
    };
  }
}

interface PostcodeResult {
  zipCode: string;
  address: string;
}

export const useDaumPostcode = (onComplete: (result: PostcodeResult) => void) => {
  const openPostcode = useCallback(() => {
    if (typeof window === 'undefined' || !window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        onComplete({ zipCode: data.zonecode, address: data.address });
      },
    }).open();
  }, [onComplete]);

  return { openPostcode };
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/hooks/useDaumPostcode.ts
git commit -m "feat: 다음 우편번호 API 커스텀 훅 추가"
```

---

## Task 6: OrderInfoSection

**Files:**
- Create: `src/features/order/ui/detail/OrderInfoSection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { OrderDetail } from '../../types/order.types';
import { getShoppingMallName } from '@/utils/shoppingMallGenerator';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    {children}
  </div>
);

export const OrderInfoSection = ({ order, isEditMode }: Props) => {
  const { register } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Field label="주문번호">
            <p className="text-sm font-medium">{order.orderNumber}</p>
          </Field>
          <Field label="쇼핑몰 주문번호">
            <p className="text-sm font-medium">{order.shopOrderNumber}</p>
          </Field>
          <Field label="결제일">
            <p className="text-sm font-medium">{order.paymentDate}</p>
          </Field>
          <Field label="주문수집일">
            <p className="text-sm font-medium">{order.orderCollectionDate}</p>
          </Field>
          <Field label="쇼핑몰">
            <p className="text-sm font-medium">{getShoppingMallName(order.shoppingMallName)}</p>
          </Field>
          <Field label="주문상품명">
            {isEditMode ? (
              <Input {...register('orderProductName')} />
            ) : (
              <p className="text-sm font-medium">{order.orderProductName}</p>
            )}
          </Field>
          <Field label="주문금액">
            {isEditMode ? (
              <Input type="number" {...register('orderPrice', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderPrice.toLocaleString()}원</p>
            )}
          </Field>
          <Field label="주문수량">
            {isEditMode ? (
              <Input type="number" {...register('orderTotalQuantity', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderTotalQuantity}</p>
            )}
          </Field>
          <Field label="배송타입">
            {isEditMode ? (
              <Input {...register('orderDeliveryType')} />
            ) : (
              <p className="text-sm font-medium">{order.orderDeliveryType}</p>
            )}
          </Field>
          <Field label="배송비">
            {isEditMode ? (
              <Input type="number" {...register('orderDeliveryPrice', { valueAsNumber: true })} />
            ) : (
              <p className="text-sm font-medium">{order.orderDeliveryPrice.toLocaleString()}원</p>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrderInfoSection.tsx
git commit -m "feat(order): OrderInfoSection 컴포넌트 구현"
```

---

## Task 7: OrdererRecipientSection

**Files:**
- Create: `src/features/order/ui/detail/OrdererRecipientSection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OrderDetail } from '../../types/order.types';
import { useDaumPostcode } from '@/hooks/useDaumPostcode';
import { phoneNumberFormatter } from '@/utils/numberGenerator';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    {children}
  </div>
);

export const OrdererRecipientSection = ({ order, isEditMode }: Props) => {
  const { register, setValue } = useFormContext<OrderDetail>();

  const { openPostcode: openOrdererPostcode } = useDaumPostcode(({ zipCode, address }) => {
    setValue('orderZipCode', zipCode);
    setValue('orderAddress', address);
  });

  const { openPostcode: openPayeePostcode } = useDaumPostcode(({ zipCode, address }) => {
    setValue('payeeZipCode', zipCode);
    setValue('payeeAddress', address);
  });

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 주문자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>주문자 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="이름">
            {isEditMode ? <Input {...register('orderName')} /> : <p className="text-sm font-medium">{order.orderName}</p>}
          </Field>
          <Field label="연락처">
            {isEditMode ? (
              <Input {...register('orderPhoneNumber')} />
            ) : (
              <p className="text-sm font-medium">{phoneNumberFormatter(order.orderPhoneNumber)}</p>
            )}
          </Field>
          <Field label="우편번호">
            {isEditMode ? (
              <div className="flex gap-2">
                <Input {...register('orderZipCode')} readOnly className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={openOrdererPostcode}>
                  주소검색
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium">{order.orderZipCode}</p>
            )}
          </Field>
          <Field label="주소">
            {isEditMode ? (
              <Input {...register('orderAddress')} readOnly />
            ) : (
              <p className="text-sm font-medium">{order.orderAddress}</p>
            )}
          </Field>
          <Field label="상세주소">
            {isEditMode ? (
              <Input {...register('orderDetailAddress')} placeholder="상세주소를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.orderDetailAddress || '-'}</p>
            )}
          </Field>
        </CardContent>
      </Card>

      {/* 수취인 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>수취인 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="이름">
            {isEditMode ? <Input {...register('payeeName')} /> : <p className="text-sm font-medium">{order.payeeName}</p>}
          </Field>
          <Field label="연락처">
            {isEditMode ? (
              <Input {...register('payeePhoneNumber')} />
            ) : (
              <p className="text-sm font-medium">{phoneNumberFormatter(order.payeePhoneNumber)}</p>
            )}
          </Field>
          <Field label="우편번호">
            {isEditMode ? (
              <div className="flex gap-2">
                <Input {...register('payeeZipCode')} readOnly className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={openPayeePostcode}>
                  주소검색
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium">{order.payeeZipCode}</p>
            )}
          </Field>
          <Field label="주소">
            {isEditMode ? (
              <Input {...register('payeeAddress')} readOnly />
            ) : (
              <p className="text-sm font-medium">{order.payeeAddress}</p>
            )}
          </Field>
          <Field label="상세주소">
            {isEditMode ? (
              <Input {...register('payeeDetailAddress')} placeholder="상세주소를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.payeeDetailAddress || '-'}</p>
            )}
          </Field>
          <Field label="배송메시지">
            {isEditMode ? (
              <Input {...register('deliveryMessage')} placeholder="배송메시지를 입력하세요" />
            ) : (
              <p className="text-sm font-medium">{order.deliveryMessage || '-'}</p>
            )}
          </Field>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrdererRecipientSection.tsx
git commit -m "feat(order): OrdererRecipientSection 컴포넌트 구현 (다음 우편번호 API 연동)"
```

---

## Task 8: OrderStatusSection

**Files:**
- Create: `src/features/order/ui/detail/OrderStatusSection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderDetail } from '../../types/order.types';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { ORDER_STATUS } from '../../constant/status.constants';

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderStatusSection = ({ order, isEditMode }: Props) => {
  const { control } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 상태</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditMode ? (
          <Controller
            control={control}
            name="orderStatus"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUS.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <OrderStatusBadge status={order.orderStatus} />
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrderStatusSection.tsx
git commit -m "feat(order): OrderStatusSection 컴포넌트 구현"
```

---

## Task 9: OrderClaimSection

**Files:**
- Create: `src/features/order/ui/detail/OrderClaimSection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { OrderDetail } from '../../types/order.types';

const CLAIM_TYPE_LABEL: Record<string, string> = {
  CANCEL: '취소',
  EXCHANGE: '교환',
  RETURN: '반품',
};

type Props = {
  order: OrderDetail;
  isEditMode: boolean;
};

export const OrderClaimSection = ({ order, isEditMode }: Props) => {
  const { control } = useFormContext<OrderDetail>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>클레임</CardTitle>
      </CardHeader>
      <CardContent>
        {!order.claim ? (
          <p className="text-sm text-muted-foreground">클레임 없음</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">쇼핑몰 클레임 정보</p>
              <div className="bg-muted rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">유형</span>
                  <Badge variant="outline">{CLAIM_TYPE_LABEL[order.claim.claimType]}</Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">메시지</span>
                  <p className="text-sm mt-1">{order.claim.claimMessage}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">담당자 처리 내용</p>
              {isEditMode ? (
                <Controller
                  control={control}
                  name="claim.handlerNote"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder="처리 내용을 입력하세요"
                      rows={3}
                    />
                  )}
                />
              ) : (
                <p className="text-sm">{order.claim.handlerNote || '-'}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrderClaimSection.tsx
git commit -m "feat(order): OrderClaimSection 컴포넌트 구현"
```

---

## Task 10: OrderCommentSection

**Files:**
- Create: `src/features/order/ui/detail/OrderCommentSection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
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
};

export const OrderCommentSection = ({ orderId, comments }: Props) => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => createOrderComment(orderId, content),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 코멘트</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrderCommentSection.tsx
git commit -m "feat(order): OrderCommentSection 컴포넌트 구현"
```

---

## Task 11: OrderEditHistorySection

**Files:**
- Create: `src/features/order/ui/detail/OrderEditHistorySection.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OrderEditHistory } from '../../types/order.types';

type Props = {
  editHistory: OrderEditHistory[];
};

export const OrderEditHistorySection = ({ editHistory }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (editHistory.length === 0) return null;

  const latest = editHistory[editHistory.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>수정이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            <span className="text-muted-foreground">최종 수정: </span>
            <span className="font-medium">{latest.modifiedAt}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">수정자: </span>
            <span className="font-medium">{latest.modifiedBy}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            수정이력 전체보기
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
        {isExpanded && (
          <div className="space-y-2 border-t pt-3">
            {editHistory.map((history) => (
              <div key={history.id} className="text-sm border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{history.modifiedAt}</span>
                  <span className="font-medium">{history.modifiedBy}</span>
                </div>
                {history.changedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    변경 필드: {history.changedFields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/order/ui/detail/OrderEditHistorySection.tsx
git commit -m "feat(order): OrderEditHistorySection 컴포넌트 구현"
```

---

## Task 12: OrderDetailLayout + index.ts

**Files:**
- Create: `src/features/order/ui/detail/OrderDetailLayout.tsx`
- Create: `src/features/order/ui/detail/index.ts`

- [ ] **Step 1: `OrderDetailLayout.tsx` 생성**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { getOrder } from '../../api/getOrder';
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

  const { data: order, isSuccess } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
  });

  useEffect(() => {
    if (isSuccess && order) {
      form.reset(order);
    }
  }, [isSuccess]); // isSuccess가 true로 바뀔 때만 초기화 — 이후 order 변경(코멘트 추가 등)은 form을 덮어쓰지 않음

  const { mutate: saveOrder, isPending } = useMutation({
    mutationFn: (data: OrderDetail) => updateOrder(orderId, data),
    onSuccess: (updatedOrder) => {
      form.reset(updatedOrder);
      queryClient.setQueryData(['order', orderId], updatedOrder);
      setIsEditMode(false);
      showAlert({ type: 'success', message: '주문 수정 완료' });
    },
    onError: () => {
      showAlert({ type: 'error', message: '주문 수정 실패' });
    },
  });

  const handleCancel = () => {
    if (order) form.reset(order);
    setIsEditMode(false);
  };

  if (!order) return null;

  return (
    <>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit((data) => saveOrder(data))} className="space-y-6">
          {/* 헤더 */}
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
          <OrderClaimSection order={order} isEditMode={isEditMode} />
        </form>
      </FormProvider>

      {/* 폼 외부 섹션 — 수정 모드와 무관 */}
      <div className="space-y-6 mt-6">
        <OrderCommentSection orderId={orderId} comments={order.comments} />
        <OrderEditHistorySection editHistory={order.editHistory} />
      </div>
    </>
  );
};
```

- [ ] **Step 2: `index.ts` 생성**

```typescript
export { OrderDetailLayout } from './OrderDetailLayout';
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/order/ui/detail/
git commit -m "feat(order): OrderDetailLayout 조립 및 index.ts 추가"
```

---

## Task 13: 페이지 라우트 등록

**Files:**
- Create: `src/app/(authenticated)/order/[id]/page.tsx`

- [ ] **Step 1: 파일 생성**

```typescript
import { OrderDetailLayout } from '@/features/order/ui/detail';

type Props = {
  params: Promise<{ id: string }>;
};

const OrderDetailPage = async ({ params }: Props) => {
  const { id } = await params;
  return <OrderDetailLayout orderId={id} />;
};

export default OrderDetailPage;
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/(authenticated)/order/[id]/page.tsx
git commit -m "feat(order): 주문 상세 페이지 라우트 등록"
```

---

## Task 14: 주문 목록 테이블 행 클릭 네비게이션 연결

**Files:**
- Modify: `src/features/order/ui/list/components/orderTable/OrderListTable.tsx`

- [ ] **Step 1: `useRouter` import 추가 및 행 클릭 핸들러 추가**

파일 상단 import에 추가:

```typescript
import { useRouter } from 'next/navigation';
```

`OrderListTable` 컴포넌트 내부 상단에 추가:

```typescript
const router = useRouter();
```

- [ ] **Step 2: `TableRow`에 onClick 추가, Checkbox 셀 클릭 전파 중단**

기존:
```typescript
<TableRow key={order.orderNumber}>
  <TableCell>
    <Checkbox
      checked={selectedOrders.includes(order.orderNumber)}
      onCheckedChange={(checked: boolean) => handleSelectOrder(order.orderNumber, checked)}
    />
  </TableCell>
```

변경:
```typescript
<TableRow
  key={order.orderNumber}
  className="cursor-pointer"
  onClick={() => router.push(`/order/${order.orderNumber}`)}
>
  <TableCell onClick={(e) => e.stopPropagation()}>
    <Checkbox
      checked={selectedOrders.includes(order.orderNumber)}
      onCheckedChange={(checked: boolean) => handleSelectOrder(order.orderNumber, checked)}
    />
  </TableCell>
```

- [ ] **Step 3: 작업 버튼도 전파 중단**

기존:
```typescript
<TableCell className="items-center">
  <Button variant="ghost" size="sm">
    <Edit className="h-4 w-4" />
  </Button>
</TableCell>
```

변경:
```typescript
<TableCell className="items-center" onClick={(e) => e.stopPropagation()}>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => router.push(`/order/${order.orderNumber}`)}
  >
    <Edit className="h-4 w-4" />
  </Button>
</TableCell>
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/order/ui/list/components/orderTable/OrderListTable.tsx
git commit -m "feat(order): 주문 목록 테이블 행 클릭 시 상세 페이지 이동 연결"
```

---

## 완료 후 확인

- [ ] `npm run dev` 실행 후 `/order/list` 접속
- [ ] 주문 행 클릭 → `/order/order_sample_001` 이동 확인
- [ ] 주문 상세 6개 섹션 렌더링 확인
- [ ] `[수정]` 버튼 클릭 → input 전환 확인
- [ ] 주소검색 버튼 클릭 → 다음 우편번호 팝업 오픈 확인
- [ ] `[저장]` 버튼 클릭 → 수정 완료 알림 및 조회 모드 전환 확인
- [ ] 코멘트 입력 후 저장 → 목록 갱신 확인
- [ ] 수정이력 전체보기 토글 확인
- [ ] `npm run lint` 에러 없음 확인
