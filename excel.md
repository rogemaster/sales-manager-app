## Excel 처리 구조 가이드

이 문서는 엑셀 업로드/미리보기/제출 과정을 기능 스코프 상태(Jotai)로 운용하는 기준을 정리합니다.

### 목표

- 여러 화면(products/bulk, order/register, products/sku 등)에서 공통 Excel 플로우를 재사용
- 전역 오염 없이 필요한 화면 트리에서만 상태를 유지(기능 스코프 Provider)
- 무한 렌더, 메모리 상주, 대용량 반응성 문제 방지

---

## 아키텍처 개요

- 상태 저장소: `src/components/excel/store/excelData.store.ts`
  - `excelDataAtom`: 업로드 상태(데이터, 업로드 여부, 시간)
  - `setExcelDataAtom`: 업로드 완료 시 상태 설정
  - `useExcelData()`: 업로드 데이터 조회
  - `useResetExcelData()`: 상태 초기화 훅

- UI 컴포넌트: `src/components/excel/*`
  - `ExcelUploader`: 파일 업로드/파싱 트리거
  - `ExcelUploaderContent`: 업로드 UI 내부 콘텐츠
  - `ExcelDataPreview`: 요약/오류/테이블 미리보기 + **React Query mutation으로 저장 처리**
  - `ExcelDownloader`: 템플릿/샘플 다운로드
  - `ExcelTemplateButton`: 템플릿 다운로드 버튼
  - `ExcelTemplateInfo`: 템플릿 컬럼 정보 표시
  - `UploadProgress`: 업로드 진행 상태 표시

- 전략 패턴: `src/components/excel/strategies/`
  - `productExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Product[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `orderExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Order[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `getExcelSaveStrategy(type)`: 타입(`'PRODUCT'` | `'ORDER'`)에 따라 **전략 + API 호출을 합성한 함수** 반환

- API 함수: `src/features/[feature]/api/`
  - `bulkCreateProducts(data: Product[])`: `POST /api/products/bulk`
  - `bulkCreateOrders(data: Order[])`: `POST /api/orders/bulk`

- 기능 스코프 Provider: `src/components/providers/ExcelProvider.tsx`
  - 특정 페이지/레이아웃 트리에서만 Jotai Store 제공

---

## 상태 설계

```ts
// excelData.store.ts 핵심
export interface ExcelDataState {
  data: ExcelRowWithErrors[]; // { [key: string]: string | number | boolean | null | undefined | ValidationError[] }
  isUploaded: boolean;
  uploadTime: Date | null;
}

export const excelDataAtom = atomWithReset<ExcelDataState>({
  data: [],
  isUploaded: false,
  uploadTime: null,
});

export const setExcelDataAtom = atom(null, (_, set, data: ExcelDataState['data']) => {
  set(excelDataAtom, {
    data,
    isUploaded: true,
    uploadTime: new Date(),
  });
});

// 파생 atom은 모듈 스코프에서 1회 생성하여 참조 동일성 보장
const dataAtom = selectAtom(excelDataAtom, (state) => state.data);

export function useExcelData() {
  return useAtomValue(dataAtom);
}

export function useResetExcelData() {
  return useResetAtom(excelDataAtom);
}
```

핵심 포인트

- 파생 atom(`selectAtom`)은 반드시 모듈 스코프에 선언해 무한 렌더링 방지
- 전역에는 "최소 정제 데이터"만 저장(원본/에러 상세 등 대용량은 화면 스코프 보관)

---

## 기능 스코프 Provider

```tsx
// src/components/providers/ExcelProvider.tsx
import { Provider as JotaiProvider } from 'jotai';
import { ReactNode } from 'react';

export const ExcelProvider = ({ children }: { children: ReactNode }) => {
  return <JotaiProvider>{children}</JotaiProvider>;
};
```

적용 위치 권장

- Excel을 사용하는 각 페이지/레이아웃의 루트 컴포넌트
- 예: `products/bulk`, `order/register`, `products/sku` 페이지 컴포넌트

---

## 페이지 적용 예시

```tsx
// src/app/(authenticated)/products/bulk/page.tsx
'use client';
import { ProductBulkUploadLayout } from '@/features/products/ui/bulk/ProductBulkUploadLayout';
import { ExcelProvider } from '@/components/providers/ExcelProvider';

export default function ProductBulkUpload() {
  return (
    <ExcelProvider>
      <ProductBulkUploadLayout />
    </ExcelProvider>
  );
}
```

---

## 업로드 → 미리보기 → 제출 흐름

1. 업로드/파싱 완료 시 전역 저장소에 최소 데이터 반영

```ts
// 업로더 내부
const setExcelData = useSetAtom(setExcelDataAtom);
// 파싱 완료 후
setExcelData(parsedRows);
```

2. 미리보기에서 데이터 구독 및 렌더링

```tsx
// ExcelDataPreview
const rows = useExcelData();
```

3. 저장 버튼 클릭 시 React Query mutation으로 API 전송

```tsx
// ExcelDataPreview 내부
const saveFn = getExcelSaveStrategy(saveType); // 전략 + API 합성 함수

const { mutate: saveExcelData } = useMutation({
  mutationFn: (validData: ExcelRowWithErrors[]) => saveFn(validData),
  onSuccess: (_, validData) => {
    resetExcelData();                          // API 성공 즉시 미리보기 초기화
    showAlert({ type: 'success', message: `${validData.length}개의 엑셀 데이터가 저장되었습니다.` });
  },
  onError: () => {
    showAlert({ type: 'error', message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.' });
  },
});
```

---

## 상태 초기화 타이밍(두 가지 모두 적용 권장)

- 페이지 언마운트 시 자동 초기화

```tsx
import { useEffect } from 'react';
import { useResetExcelData } from '@/store/excelDataStore';

export function SomePage() {
  const reset = useResetExcelData();
  useEffect(() => reset, [reset]); // 언마운트 시 초기화
  return null;
}
```

- API 저장 성공 시 자동 초기화 (mutation onSuccess에서 즉시 호출)

```tsx
onSuccess: () => {
  resetExcelData(); // 저장 완료 후 미리보기 데이터 초기화
}
```

- 사용자 액션(초기화/재업로드) 시 수동 초기화

```tsx
const reset = useResetExcelData();
<button onClick={reset}>초기화</button>;
```

주의

- 언마운트 자동 초기화와 사용자 액션 초기화를 함께 사용해 잔존 데이터로 인한 혼선을 방지

---

## 성능/안정성 가이드

- 파생 atom은 모듈 스코프 1회 생성(중요)
- 대용량 원본/에러 상세는 화면 스코프 보관(전역 최소화)
- 라우트 이동 시 반드시 reset(언마운트 또는 명시적 호출)
- 제출 직전에만 네트워크용 포맷으로 변환

---

## 전략 패턴 (저장 전처리 + API 합성)

업로드된 로우를 `ExcelRowWithErrors[]`에서 도메인 타입(`Product[]`, `Order[]`)으로 완전 변환하고 API 호출까지 합성하는 책임을 전략으로 분리합니다.

### 타입 흐름

```
ExcelRowWithErrors[]
  → productExcelSaveStrategy  →  Product[]  → bulkCreateProducts  →  POST /api/products/bulk
  → orderExcelSaveStrategy    →  Order[]    → bulkCreateOrders    →  POST /api/orders/bulk
```

### getExcelSaveStrategy — 전략 + API 합성

```ts
// src/components/excel/utils/getExcelSaveStrategy.ts
export const getExcelSaveStrategy = (type: SaveType) => {
  switch (type) {
    case 'PRODUCT':
      return (rows: ExcelRowWithErrors[]) => {
        const products = productExcelSaveStrategy(rows); // ExcelRowWithErrors[] → Product[]
        return bulkCreateProducts(products);             // Product[] → API
      };
    case 'ORDER':
      return (rows: ExcelRowWithErrors[]) => {
        const orders = orderExcelSaveStrategy(rows);     // ExcelRowWithErrors[] → Order[]
        return bulkCreateOrders(orders);                 // Order[] → API
      };
  }
};
```

### 전략 함수 — 한글 키 → 도메인 모델 완전 변환

```ts
// productExcelSaveStrategy: ExcelRowWithErrors[] → Product[]
export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Product[] => {
  return rows.map((r) => ({
    productId: generatorProductCode(),
    name: r['상품명'] as string,
    categoryId: (r['카테고리'] as string) || '',
    price: Number(r['판매가']),
    state: (r['판매상태'] as Product['state']) || 'WAIT_SALE',
    // ... 전체 Product 필드 매핑
  }));
};
```

강제 타입 캐스팅 없이 도메인 타입을 보장하기 때문에, MSW 핸들러에서 `MOCK_PRODUCT_DATA.push(...data)` 같은 정상적인 push가 가능합니다.

- 새 도메인 추가 시: `src/components/excel/strategies/`에 전략 함수 추가 후 `getExcelSaveStrategy`에 `case` 분기만 추가
- 전략 함수 시그니처: `(rows: ExcelRowWithErrors[]) => DomainType[]`

---

## MSW Mock API

개발환경에서 `src/mocks/handlers.ts`가 bulk API를 가로챕니다.

```ts
// 상품 대량 등록
http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
  await delay(500); // AlertProvider race condition 방지용 딜레이
  const data = (await request.json()) as Product[];
  MOCK_PRODUCT_DATA.push(...data);
  return HttpResponse.json({ success: true, count: data.length });
}),

// 주문 대량 등록
http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
  await delay(500);
  const data = (await request.json()) as Order[];
  MOCK_ORDERS_DATA.push(...data);
  return HttpResponse.json({ success: true, count: data.length });
}),
```

**delay(500) 이유**

`AlertProvider`의 닫힘 애니메이션 처리에 200ms `setTimeout`이 있습니다. MSW가 즉시 응답하면 저장 확인 alert가 닫히는 200ms 사이에 성공 alert options가 설정됐다가 타이머에 의해 초기화되는 race condition이 발생합니다. 500ms 딜레이로 타이머가 만료된 이후에 `onSuccess`가 실행되도록 보장합니다.

---

## 타입/검증 가이드

- `ExcelRowWithErrors`: 셀 값 타입(`string | number | boolean | null | undefined`) 외에 `ValidationError[]`도 값으로 허용하는 유니온 타입. 검증 오류를 동일 로우 객체에 키로 포함시켜 미리보기 테이블에서 인라인 표시 가능
- 업로드된 로우는 `ExcelRowWithErrors[]`로 전역 스토어에 저장하고, 저장 시 전략 함수가 도메인 타입(`Product[]`, `Order[]`)으로 완전 변환 후 API 전송
- 검증 로직은 `src/components/excel/utils/validate.ts`에 구현하고, 화면별 유효성 기준에 따라 분리 적용

---

## 테스트 체크리스트

- 업로드 후 미리보기 정상 렌더 및 카운트 노출
- 저장 성공 시 성공 alert 표시 및 미리보기 데이터 초기화 확인
- 저장 실패 시 에러 alert 표시 확인
- 라우트 이동/새로고침 시 상태 초기화 확인
- 초기화/재업로드 버튼 동작 확인
- 무한 렌더/성능 이슈(프레임 드랍, 메모리 누수) 부재 확인
- 다중 페이지에서 연속 사용 시 데이터 충돌 없음 확인

---

## 향후 확장

- 필요 시 세션/로컬스토리지 또는 URL 파라미터로 얕은 영속화 제공
- 페이지별 독립 Store를 사용해 서로 다른 업로드 세션 병행 가능
- AlertProvider의 `setTimeout` race condition은 `useRef`로 타이머를 관리하는 방식으로 근본 해결 가능 (현재는 MSW delay로 우회)
