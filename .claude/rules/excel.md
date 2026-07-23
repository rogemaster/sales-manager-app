## Excel 처리 구조 가이드

이 문서는 엑셀 업로드/미리보기/제출 과정을 기능 스코프 상태(Jotai)로 운용하는 기준을 정리합니다.

### 목표

- 여러 화면(products/bulk 등)에서 공통 Excel 플로우를 재사용
- 전역 오염 없이 필요한 화면 트리에서만 상태를 유지(기능 스코프 Provider)
- 무한 렌더, 메모리 상주, 대용량 반응성 문제 방지

---

## 아키텍처 개요

- 상태 저장소: `src/components/excel/store/excelData.store.ts`
  - `excelDataAtom`: 업로드 상태(데이터, 업로드 여부, 시간)
  - `setExcelDataAtom`: 업로드 완료 시 상태 설정
  - `useExcelData()`: 업로드 데이터 조회
  - `useResetExcelData()`: 상태 초기화 훅

- UI 컴포넌트: `src/components/excel/`
  - `ExcelUploader`: Card 래퍼, ExcelHeader + ExcelUploaderContent 렌더링
  - `ExcelUploaderContent`: 파일 입력, 업로드 처리, `setExcelDataAtom` 호출
  - `ExcelDataPreview`: 미리보기 헤더/요약/오류 알림/테이블 + **React Query mutation으로 저장 처리**
  - `ExcelDownloader`: Card 래퍼, 템플릿 다운로드 버튼 + 템플릿 정보 표시
  - `ExcelTemplateButton`: 템플릿 다운로드 버튼
  - `ExcelTemplateInfo`: 템플릿 컬럼 정보 표시

- 서브 컴포넌트: `src/components/excel/components/`
  - `ExcelHeader`: 업로드/다운로드 아이콘 + 제목/설명 표시
  - `ExcelDataPreviewHeader`: 초기화 버튼 + 저장 버튼 (유효 카운트 표시)
  - `ExcelDataSummaryInfo`: 총 데이터/유효/오류 카운트 3칸 그리드
  - `ExcelDataErrorAlert`: 오류 데이터 존재 시 destructive Alert 표시
  - `ExcelDataTable`: 테이블 렌더링, `React.memo` 최적화, 오류행 하이라이트

- 전략 패턴: `src/components/excel/strategies/`
  - `productExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Product[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `orderExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Order[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `getExcelSaveStrategy(type)`: 타입(`'PRODUCT'` | `'ORDER'`)에 따라 **전략 + API 호출을 합성한 함수** 반환

- 유틸리티: `src/components/excel/utils/`
  - `processExcelUpload(event, fileTemplateInfo)`: XLSX 파싱, 파일 검증, 필드 검증 → `UploadResult` 반환
  - `validateExcelData(rowsData, requiredHeaders)`: 필수 필드/빈 값 검증 → `ValidationResult` 반환
  - `excelDownload(templateHeaders, templateName)`: ExcelJS로 템플릿 생성 후 file-saver로 다운로드
  - `getExcelSaveStrategy(type)`: 전략 + API 합성 함수 반환

- 메시지 매핑: `src/components/excel/message.ts`
  - `excelUploadErrorCodeToMessage(code)`: `UploadErrorCode` → 한글 메시지
  - `excelValidErrorsCodeToMessages(errors)`: `ValidationError[]` → 메시지 추가

- API 함수: `src/features/[feature]/api/`
  - `bulkCreateProducts(data: Product[])`: `POST /api/products/bulk`
  - `bulkCreateOrders(data: Order[])`: `POST /api/orders/bulk`

- 기능 스코프 Provider: `src/components/providers/ExcelProvider.tsx`
  - 특정 페이지/레이아웃 트리에서만 Jotai Store 제공

---

## 타입 정의 (`src/types/excel.type.ts`)

```ts
export interface ExcelDataState {
  data: ExcelRowWithErrors[];
  isUploaded: boolean;
  uploadTime: Date | null;
}

// 셀 값 타입 (검증 오류 미포함)
export type ExcelRowType = { [key: string]: string | number | boolean | null | undefined };

// 셀 값 + 검증 오류를 동일 로우 객체에 포함
export type ExcelRowWithErrors = { [key: string]: string | number | boolean | null | undefined | ValidationError[] };

export interface ValidationError {
  row: number;
  header: string;
  code: 'MISSING_FIELD' | 'EMPTY_VALUE';
  message?: string;
}

export type UploadErrorCode = 'NO_FILE_SELECTED' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'PROCESSING_ERROR';
export type ValidationErrorCode = 'MISSING_FIELD' | 'EMPTY_VALUE';

// processExcelUpload 반환 타입
export type UploadResult =
  | { success: true; data: ExcelRowWithErrors[] }
  | { success: false; errorType: 'UPLOAD_ERROR'; uploadError: UploadErrorCode }
  | { success: false; errorType: 'VALIDATE_ERROR'; validationResult: ValidationResult };
```

---

## 상태 설계

```ts
// excelData.store.ts 핵심
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

적용 위치

- Excel을 사용하는 각 페이지/레이아웃의 루트 컴포넌트에 감싼다
- 현재 적용됨: `products/bulk`
- 향후 적용 예정: `order/create` (미구현)

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

## 도메인별 상수 파일

각 도메인의 `constant/` 디렉토리에 Excel 관련 상수를 분리한다.

```
src/features/products/constant/
├── excel.constants.tsx        # 미리보기 테이블 컬럼 정의 (PRODUCT_EXCEL_TABLE_COLUMNS 등)
└── bulkTemplate.constant.ts   # 템플릿 컬럼 정의 (PRODUCT_BULK_EXCEL_TEMPLATE 등)
```

템플릿 컬럼 정의 예시 (`ExcelTemplateInfo[]`):

```ts
[
  { name: '상품명', req: true },
  { name: '판매가', req: true },
  { name: '판매상태', req: true },
  { name: '카테고리', req: false },
  // ...
]
```

미리보기 테이블 컬럼 정의 예시:

```ts
[
  { key: 'row', headerTitle: '행', accessor: (_, index) => index + 1 },
  { key: 'state', headerTitle: '상태', accessor: (r) => Array.isArray(r.error) && r.error.length > 0 ? '오류' : '정상' },
  { key: 'name', headerTitle: '상품명', accessor: (r) => !Array.isArray(r['상품명']) && r['상품명'] },
  // ...
]
```

---

## 업로드 → 미리보기 → 제출 흐름

1. 업로드/파싱 완료 시 전역 저장소에 최소 데이터 반영

```ts
// ExcelUploaderContent 내부
const setExcelData = useSetAtom(setExcelDataAtom);
const result = await processExcelUpload(event, fileTemplateInfo);
if (result.success) setExcelData(result.data);
```

2. 미리보기에서 데이터 구독 및 렌더링

```tsx
// ExcelDataPreview
const rows = useExcelData();
```

3. 저장 버튼 클릭 시 React Query mutation으로 API 전송

```tsx
// ExcelDataPreview 내부
const saveFn = getExcelSaveStrategy(saveType);

const { mutate: saveExcelData } = useMutation({
  mutationFn: (validData: ExcelRowWithErrors[]) => saveFn(validData),
  onSuccess: (_, validData) => {
    resetExcelData();
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
const reset = useResetExcelData();
useEffect(() => reset, [reset]); // 언마운트 시 초기화
```

- API 저장 성공 시 자동 초기화 (mutation onSuccess에서 즉시 호출)

```tsx
onSuccess: () => {
  resetExcelData();
}
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
        const products = productExcelSaveStrategy(rows);
        return bulkCreateProducts(products);
      };
    case 'ORDER':
      return (rows: ExcelRowWithErrors[]) => {
        const orders = orderExcelSaveStrategy(rows);
        return bulkCreateOrders(orders);
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

- 새 도메인 추가 시: `src/components/excel/strategies/`에 전략 함수 추가 후 `getExcelSaveStrategy`에 `case` 분기만 추가
- 전략 함수 시그니처: `(rows: ExcelRowWithErrors[]) => DomainType[]`

---

## MSW Mock API

개발환경에서 bulk API를 가로챕니다.

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

## 구현 현황

| 기능 | 상태 |
|------|------|
| 상품 대량 등록 (`products/bulk`) | ✅ 완료 |
| 주문 대량 등록 전략 함수 (`orderExcelSaveStrategy`) | ✅ 완료 |
| 주문 대량 등록 페이지 (`order/create`) | ⬜ 미구현 |

---

## 향후 확장

- 필요 시 세션/로컬스토리지 또는 URL 파라미터로 얕은 영속화 제공
- 페이지별 독립 Store를 사용해 서로 다른 업로드 세션 병행 가능
- AlertProvider의 `setTimeout` race condition은 `useRef`로 타이머를 관리하는 방식으로 근본 해결 가능 (현재는 MSW delay로 우회)
