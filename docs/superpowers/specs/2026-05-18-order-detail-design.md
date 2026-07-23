# 주문 상세 페이지 설계 문서

**작성일:** 2026-05-18  
**작성자:** Claude Code (brainstorming)

---

## 1. 개요

주문 상세 페이지(`/order/[id]`)를 신규 구현한다.  
주문 정보 조회가 주 목적이며, 수정 버튼을 통한 인라인 수정을 지원한다.  
백엔드 연동 전까지 MSW 목 데이터로 프론트엔드 구현을 완료한다.

---

## 2. 라우팅 & 파일 구조

### 신규 라우트

| 경로 | 설명 |
|------|------|
| `/order/[id]` | 주문 상세 페이지 |

주문 목록(`/order/list`) 테이블 행 클릭 시 해당 라우트로 이동한다.

### 디렉토리 구조

```
src/app/(authenticated)/order/[id]/page.tsx

src/features/order/
├── api/
│   └── getOrder.ts                        # 주문 단건 조회 API 함수
├── types/
│   └── order.types.ts                     # OrderDetail, OrderComment, OrderClaim, OrderEditHistory 타입 추가
└── ui/
    └── detail/
        ├── index.ts
        ├── OrderDetailLayout.tsx           # 메인 레이아웃, 뷰/수정 모드 상태 관리
        ├── OrderInfoSection.tsx            # 주문정보 섹션
        ├── OrdererRecipientSection.tsx     # 주문자/수취인 정보 섹션 (좌우 2열)
        ├── OrderStatusSection.tsx          # 주문상태 섹션
        ├── OrderClaimSection.tsx           # 클레임 섹션
        ├── OrderCommentSection.tsx         # 코멘트 섹션
        └── OrderEditHistorySection.tsx     # 수정이력 섹션

src/hooks/
└── useDaumPostcode.ts                      # 다음 우편번호 팝업 커스텀 훅

src/mocks/handlers/order.ts                # getOrder MSW 핸들러 추가
```

---

## 3. 데이터 모델

### 타입 정의 (`order.types.ts` 추가)

```typescript
// 주문 상세 (기존 Order 확장)
export interface OrderDetail extends Order {
  claim?: OrderClaim;
  comments: OrderComment[];
  editHistory: OrderEditHistory[];
}

// 클레임
export interface OrderClaim {
  claimType: 'CANCEL' | 'EXCHANGE' | 'RETURN';  // 클레임 유형
  claimMessage: string;                           // 쇼핑몰 원본 메시지 (읽기전용)
  handlerNote?: string;                           // 담당자 처리 내용 (수정 가능)
}

// 코멘트
export interface OrderComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

// 수정이력 단건
export interface OrderEditHistory {
  id: string;
  modifiedAt: string;
  modifiedBy: string;
  changedFields: string[];  // 변경된 필드명 목록
}
```

### MSW 목 데이터

`getOrder` 핸들러는 `orderNumber`를 path param으로 받아 `OrderDetail` 형태의 목 데이터를 반환한다. 코멘트 2~3건, 수정이력 2~3건, 클레임 1건을 기본 포함한다.

---

## 4. 상태 관리

| 상태 | 방식 | 위치 |
|------|------|------|
| 뷰/수정 모드 전환 | `useState<boolean>` | `OrderDetailLayout` |
| 주문 상세 데이터 | `useQuery(['order', id])` | `OrderDetailLayout` |
| 수정 저장 | `useMutation` | `OrderDetailLayout` |
| 코멘트 저장 | `useMutation` | `OrderCommentSection` |
| 수정이력 펼침 여부 | `useState<boolean>` | `OrderEditHistorySection` |

Jotai는 사용하지 않는다. 모든 상태가 이 페이지에만 해당하므로 로컬 상태로 충분하다.

---

## 5. 페이지 레이아웃

### 헤더

```
주문 상세                          [수정 버튼]
주문번호: ORD-20240518-001
```

- 조회 모드: `[수정]` 버튼
- 수정 모드: `[저장]` `[취소]` 버튼으로 전환

### 섹션 구성 (위 → 아래 순서)

1. 주문정보
2. 주문자 / 수취인 정보 (좌우 2열)
3. 주문상태
4. 클레임
5. 주문코멘트
6. 수정이력

---

## 6. 섹션별 상세 동작

### 6-1. 주문정보 섹션

| 필드 | 조회 모드 | 수정 모드 |
|------|-----------|-----------|
| 주문번호 | 텍스트 | 읽기전용 |
| 쇼핑몰 주문번호 | 텍스트 | 읽기전용 |
| 결제일 | 텍스트 | 읽기전용 |
| 주문수집일 | 텍스트 | 읽기전용 |
| 주문상품명 | 텍스트 | input |
| 주문금액 | 텍스트 | input (number) |
| 주문수량 | 텍스트 | input (number) |
| 배송타입 | 텍스트 | input |
| 배송비 | 텍스트 | input (number) |

### 6-2. 주문자 / 수취인 정보 섹션

좌(주문자) / 우(수취인) 2열 구성.

| 필드 | 조회 모드 | 수정 모드 |
|------|-----------|-----------|
| 이름 | 텍스트 | input |
| 연락처 | 텍스트 | input |
| 우편번호 | 텍스트 | input + `[주소검색]` 버튼 |
| 주소 | 텍스트 | input (자동 입력) |
| 상세주소 | 텍스트 | input (직접 입력) |
| 배송메시지 | 텍스트 | input |

**주소 검색 동작:**
- `[주소검색]` 버튼 클릭 → `useDaumPostcode` 훅으로 다음 우편번호 팝업 오픈
- 주소 선택 시 `우편번호`, `기본주소` 자동 입력 (`react-hook-form` `setValue`)
- `상세주소`는 사용자 직접 입력
- 주문자 / 수취인 각각 독립적인 검색 버튼 보유
- 다음 우편번호 스크립트는 `next/script`로 로드

### 6-3. 주문상태 섹션

- 조회 모드: 기존 `OrderStatusBadge` 컴포넌트 재사용
- 수정 모드: `<Select>` 드롭다운으로 전환 (`ORDER_STATUS` 상수 활용)

### 6-4. 클레임 섹션

클레임이 없는 경우 "클레임 없음" 안내 텍스트 표시.

**쇼핑몰 클레임 정보 (항상 읽기전용)**
- 클레임 유형: 텍스트 배지 (`CANCEL` / `EXCHANGE` / `RETURN`)
- 클레임 메시지: 텍스트

**담당자 처리 내용**
- 조회 모드: 텍스트 (미입력 시 "-")
- 수정 모드: `textarea`로 전환

### 6-5. 주문코멘트 섹션

수정 모드와 무관하게 항상 활성화.

**코멘트 목록**
- 작성일 / 작성자 / 코멘트 내용을 시간순으로 표시
- 코멘트 수정/삭제 불가 (작성 전용)

**코멘트 입력**
- `textarea` 입력창
- `[저장]` 버튼 클릭 시 `useMutation`으로 저장
- 저장 성공 시 입력창 초기화, 목록 갱신 (`invalidateQueries`)

### 6-6. 수정이력 섹션

- 기본 표시: 최종 수정일 + 수정자 이름
- `[수정이력 전체보기 ▼]` 버튼 클릭 시 전체 이력 리스트 펼침
- 이력 항목: 수정일시 / 수정자 / 변경 필드 목록

---

## 7. API

### `getOrder(orderId: string): Promise<OrderDetail>`

```
GET /api/orders/[id]
```

MSW 핸들러에서 mock 데이터 반환.

### `updateOrder(orderId: string, data: Partial<OrderDetail>): Promise<OrderDetail>`

```
PATCH /api/orders/[id]
```

저장 성공 시 `editHistory`에 새 이력 추가 (mock 처리).

### `createOrderComment(orderId: string, content: string): Promise<OrderComment>`

```
POST /api/orders/[id]/comments
```

---

## 8. 의존성

| 패키지 | 용도 | 신규 여부 |
|--------|------|-----------|
| `@types/daum.postcode` | 다음 우편번호 API 타입 | 신규 설치 필요 |
| `react-hook-form` | 폼 상태 관리 | 기존 사용 중 |
| `@tanstack/react-query` | 서버 상태 | 기존 사용 중 |
| `next/script` | 다음 우편번호 스크립트 로드 | 기존 사용 중 |

---

## 9. 구현 순서

1. 타입 정의 (`order.types.ts` 확장)
2. MSW 핸들러 추가 (`getOrder`, `updateOrder`, `createOrderComment`)
3. API 함수 작성 (`getOrder.ts`, `updateOrder.ts`, `createOrderComment.ts`)
4. `useDaumPostcode` 훅 작성
5. 섹션 컴포넌트 작성 (정보 → 주문자/수취인 → 상태 → 클레임 → 코멘트 → 수정이력)
6. `OrderDetailLayout` 조립
7. `/order/[id]/page.tsx` 등록
8. 주문 목록 테이블 행 클릭 → 상세 페이지 이동 연결
