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
  - `ExcelSaveProgressDialog`: 저장 중 진행률 모달 (이미지 저장 → 상품 정보 저장 단계)
  - `ExcelDataSummaryInfo`: 총 데이터/유효/오류 카운트 3칸 그리드
  - `ExcelDataErrorAlert`: 오류 데이터 존재 시 destructive Alert 표시
  - `ExcelDataTable`: 테이블 렌더링, `React.memo` 최적화, 오류행 하이라이트

- 전략 패턴: `src/components/excel/strategies/`
  - `productExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Product[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `orderExcelSaveStrategy`: `ExcelRowWithErrors[]` → `Order[]` 완전 변환 (한글 키 → 영문 도메인 필드 매핑)
  - `getExcelSaveStrategy(type)`: 타입(`'PRODUCT'` | `'ORDER'`)에 따라 **전략 + API 호출을 합성한 함수** 반환

- 유틸리티: `src/components/excel/utils/`
  - `processExcelUpload(event, fileTemplateInfo, maxRows?)`: XLSX 파싱(`readSheetRows`), 시트 행 번호 부여, 행 수 제한, 파일 검증, 필드 검증 → `UploadResult` 반환
  - `checkExcelImageColumns(rows, templateInfo, checkFn, options)`: `remoteImage` 컬럼의 주소를 서버에 확인시켜 `INVALID_IMAGE` 오류 반환
  - `checkExcelUniqueCodeColumns(rows, templateInfo, checkFn)`: `uniqueCode` 컬럼의 파일 안 중복과 이미 등록된 코드와의 중복을 `DUPLICATE_IN_FILE`·`DUPLICATE_EXISTING` 오류로, 확인 실패를 `CODE_CHECK_FAILED`로 반환
  - `validateExcelData(rowsData, templateInfo)`: 필수 필드/빈 값/허용값 검증 → `ValidationResult` 반환. 헤더만 추리지 않고 양식 전체(`ExcelTemplateInfo[]`)를 받는다 — `req`와 `allowed`가 모두 양식 정의에 있기 때문
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
  row: number; // 엑셀 시트 행 번호 (아래 "행 번호" 절)
  header: string;
  code:
    | 'MISSING_FIELD'
    | 'EMPTY_VALUE'
    | 'INVALID_VALUE'
    | 'INVALID_NUMBER'
    | 'INVALID_IMAGE'
    | 'INVALID_CODE'
    | 'DUPLICATE_IN_FILE'
    | 'DUPLICATE_EXISTING'
    | 'CODE_CHECK_FAILED';
  message?: string;
  value?: string; // INVALID_VALUE·INVALID_NUMBER·DUPLICATE_* — 사용자가 적은 값
  allowed?: string[];
  reason?: string; // INVALID_IMAGE — 서버가 알려준 사유, INVALID_CODE — 코드 길이 초과 사유
  rows?: number[]; // DUPLICATE_IN_FILE — 같은 코드를 가진 시트 행 전체
  existingCode?: string; // DUPLICATE_EXISTING — 이미 등록된 쪽의 실제 표기
}

export type UploadErrorCode =
  | 'NO_FILE_SELECTED'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'TOO_MANY_ROWS'
  | 'PROCESSING_ERROR';
export type ValidationErrorCode = 'MISSING_FIELD' | 'EMPTY_VALUE' | 'INVALID_VALUE' | 'INVALID_NUMBER' | 'INVALID_IMAGE' | 'INVALID_CODE' | 'DUPLICATE_IN_FILE' | 'DUPLICATE_EXISTING' | 'CODE_CHECK_FAILED';

// processExcelUpload 반환 타입
export type UploadResult =
  | { success: true; data: ExcelRowWithErrors[] }
  | { success: false; errorType: 'UPLOAD_ERROR'; uploadError: UploadErrorCode }
  | { success: false; errorType: 'VALIDATE_ERROR'; validationResult: ValidationResult };

// 저장 결과. 이미지를 가져오지 못한 행은 빼고 저장하므로 "일부 성공"이 정상 결과에 포함된다
export type ExcelRowFailure = { rowNumber: number; message: string };
export type ExcelSaveResult = { savedCount: number; failures: ExcelRowFailure[] };
export type ExcelSaveFn = (
  rows: ExcelRowWithErrors[],
  context?: { onProgress?: (done: number, total: number) => void },
) => Promise<ExcelSaveResult>;
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

**⚠️ 이 패턴을 Excel 밖으로 확장할 때의 제약**

`<Provider>`는 하위 트리에 **새 store**를 만들어 그 트리가 읽는 **모든 atom**을 초기값으로 되돌린다. auth 정보는 `(authenticated)/layout.tsx`가 **전역 store**에 주입하므로, Provider로 감싼 트리에서는 `workspaceOwnerIdAtom`이 `''`이 되고 `enabled: !!workspaceOwnerId` 게이팅에 걸려 **목록 쿼리가 영구히 비활성화된다**(에러도 요청도 없이 빈 화면).

`products/bulk`에서 문제가 없는 이유는 그 트리가 auth atom을 읽지 않기 때문이다. 즉 이 패턴은 **자기 완결적 기능 상태에만** 쓸 수 있고, 화면 간 상태 격리 용도로는 쓸 수 없다. 자세한 내용과 대안은 [`docs/solutions/architecture-patterns/scoped-jotai-provider-breaks-auth-atoms.md`](../../docs/solutions/architecture-patterns/scoped-jotai-provider-breaks-auth-atoms.md) 참고.

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
  // 코드값만 허용되는 컬럼은 allowed를 붙인다. 목록은 화면 Select가 쓰는 상수에서 파생시킨다
  { name: '판매상태', req: true, allowed: PRODUCT_STATUS.map(({ name }) => name) },
  { name: '카테고리', req: false },
  // ...
]
```

**`numeric`은 두 가지 의미를 갖는다.** 다운로드 양식에서 숫자 서식으로 만들고, **업로드 검증에서 0 이상 정수인지 검사한다.** 현재 양식의 숫자 컬럼(공급가·판매가·배송비·총수량)이 전부 같은 규칙이라 표시 하나로 충분하다. 다른 규칙이 필요한 숫자 컬럼이 생기면 그때 표현을 늘린다.

**`remoteImage`는 외부 이미지 주소 컬럼이다.** 붙이면 업로드 시 `checkExcelImageColumns`가 서버(`/api/products/image/check`)에 주소를 확인시켜 실패한 행을 `INVALID_IMAGE` 오류로 잡는다. 확인만 하고 R2에는 저장하지 않는다 — 사용자가 저장하지 않고 초기화하면 파일만 남기 때문이다. 실제로 R2에 가져오는 것은 저장 전략이다(아래 전략 패턴 절). 빈 값은 확인하지 않고, 필드 오류가 있는 행도 확인한다.

**`uniqueCode`는 워크스페이스 안에서 겹치면 안 되는 코드 컬럼이다(현재 `고객상품코드`뿐).** 붙이면 업로드 시 `checkExcelUniqueCodeColumns`가 파일 안 중복(묶음의 **모든 행**을 오류로)과 이미 등록된 코드와의 중복(`/api/products/customer-code/check` 1회 호출)을 잡는다. 비교는 공백·대소문자를 무시한다. 확인 전에 **100자를 넘는 코드**를 `INVALID_CODE`로 잡고 확인 대상에서 뺀다 — 확인 API에 보내면 요청 전체가 400이 되어 모든 행이 `CODE_CHECK_FAILED`가 된다. 저장 단계가 아니라 업로드에서 거르는 이유는 이미지를 R2에 받기 전에 빼야 고아 파일이 생기지 않기 때문이다. 순서는 필드 검사 → 코드 중복 확인 → 이미지 확인이다.

**`maxRows`(업로더 prop)를 넘기면 파일 행 수를 제한한다.** 넘으면 `TOO_MANY_ROWS`로 파일 자체를 거부한다. 상품은 `PRODUCT_BULK_MAX_ROWS`(50)를 넘기고, bulk route도 같은 상수로 한 번 더 거부한다. 넘기지 않은 화면은 제한이 없다.

### 셀 값은 글자로 읽는다 — 숫자 컬럼만 예외

`readSheetRows`(`sheetRows.ts`)가 **숫자 컬럼(`numeric`)이 아닌 칸은 화면에 보이는 글자**(`raw: false`)로, 숫자 컬럼만 원래 값으로 읽는다.

- **함정:** `sheet_to_json` 기본값(원래 값)은 셀 타입을 그대로 넘긴다. 다운로드 양식은 글자 컬럼에 텍스트 서식(`@`)을 걸어 두지만, 직접 만든 파일·서식이 "일반"인 칸·**CSV**에서는 `TRUE`가 불리언이 되고 `00123`이 숫자 123이 되어 **값이 조용히 바뀐다.**
- 숫자 컬럼까지 글자로 읽으면 쉼표 서식이 `"1,000"`이 되어 숫자 검증에서 걸리므로 나눠 읽는다.

### 행 번호 — 엑셀 시트 행으로 통일

미리보기 '행' 컬럼, 업로드 검증 오류의 `row`, 저장 결과 알림, bulk route 오류가 **전부 엑셀 시트 행 번호**를 쓴다. 사용자가 파일에서 그 행을 바로 찾을 수 있어야 하기 때문이다.

- 파싱 직후 `attachSheetRowNumbers`가 각 행에 `EXCEL_SHEET_ROW_KEY`로 번호를 붙이고, 이후 모든 층은 `getSheetRow(row)`로 읽는다. **index로 계산하지 않는다.**
- **함정:** `sheet_to_json`은 빈 행을 건너뛰어 `index + 2`가 틀린다. SheetJS가 넣어주는 `__rowNum__`은 열거 불가 속성이라 `{ ...row }`에서 사라진다 — 반드시 **펼치기 전에** 복사한다.
- bulk route는 시트 개념을 모른다. 오류를 `{ error, rowIndex }`(요청 배열 기준)로 돌려주고, `bulkCreateProducts`가 `formatBulkRowError`로 `[4행] 사유`를 만든다.

미리보기 테이블 컬럼 정의 예시:

```ts
[
  { key: 'row', headerTitle: '행', accessor: (r) => getSheetRow(r) },
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
export const getExcelSaveStrategy = (type: SaveType, ownerId: string): ExcelSaveFn => {
  switch (type) {
    case 'PRODUCT':
      return async (rows, context) => {
        const products = productExcelSaveStrategy(rows);
        // 외부 이미지 주소를 R2로 가져와 key로 바꾼다. 실패한 행은 빼고 failures로 모은다
        const { resolved, failures } = await resolveExcelMainImages(products, rows.map(getSheetRow), importProductImage, {
          concurrency: REMOTE_IMAGE_CONCURRENCY,
          onProgress: context?.onProgress,
        });
        if (resolved.length === 0) throw new Error(formatExcelFailureSummary(failures));
        await bulkCreateProducts(resolved.map(({ product }) => product), ownerId, resolved.map(({ rowNumber }) => rowNumber));
        return { savedCount: resolved.length, failures };
      };
    case 'ORDER':
      return async (rows) => {
        await bulkCreateOrders(orderExcelSaveStrategy(rows), ownerId);
        return { savedCount: rows.length, failures: [] };
      };
  }
};
```

- 저장 결과 알림은 `formatExcelFailureSummary`로 **첫 번째 오류(시트 행이 가장 작은 것) + `(외 N건 오류)`**만 보여준다. 일부 실패는 `warning` 알림 후 초기화, 전부 실패는 오류로 올려 미리보기를 유지한다.
- 저장 중에는 미리보기 헤더의 저장·초기화 버튼을 비활성화한다(이미지 가져오기로 수 초 이상 걸려 중복 등록 위험).
- 진행률은 `ExcelSaveProgressDialog`(닫을 수 없는 모달)가 보여주고, 저장 중에는 `beforeunload` 경고를 켠다. `onProgress`는 이미지 단계에서만 알리므로 `done === total`을 상품 정보 저장 단계로 읽는다(`getExcelSaveProgressView`).

### 전략 함수 — 한글 키 → 도메인 모델 완전 변환

```ts
// productExcelSaveStrategy: ExcelRowWithErrors[] → Product[]
export const productExcelSaveStrategy = (rows: ExcelRowWithErrors[]): Product[] => {
  return rows.map((r) => ({
    productId: generatorProductCode(),
    name: r['상품명'] as string,
    categoryId: (r['카테고리'] as string) || '',
    price: Number(r['판매가']),
    // 표시명 → 코드. as 캐스팅으로 통과시키지 않는다 (아래 주의 참고)
    state: (toCode(PRODUCT_STATUS, r['판매상태']) as Product['state']) || 'WAIT_SALE',
    // ... 전체 Product 필드 매핑
  }));
};
```

- 새 도메인 추가 시: `src/components/excel/strategies/`에 전략 함수 추가 후 `getExcelSaveStrategy`에 `case` 분기만 추가
- 전략 함수 시그니처: `(rows: ExcelRowWithErrors[]) => DomainType[]`

**주의 — 표시명을 `as`로 통과시키지 않는다.** 시트에는 사용자가 '판매중' 같은 표시명을 적는다. `as`는 컴파일 타임 캐스팅이라 런타임에는 한글이 그대로 남고, 저장 컬럼이 `text`라 DB도 거부하지 않는다. 증상은 한참 뒤 목록 화면의 렌더 예외로 나타난다. 코드값만 허용되는 필드는 **양식에 `allowed`를 붙이고(검증), 전략에서 코드로 바꾸고(변환), route에서 한 번 더 거부한다(강제).** 세 층의 역할 분담과 표시 층에서 디폴트로 메우면 안 되는 이유는 [`display-label-to-domain-code-boundary.md`](../../docs/solutions/architecture-patterns/display-label-to-domain-code-boundary.md) 참고.

---

## bulk API — 도메인마다 처리 층이 다르다

| 도메인 | 처리 층 | 위치 |
|--------|---------|------|
| 상품 (`/api/products/bulk`) | **실제 route handler** (Neon + R2) | `src/app/api/products/bulk/route.ts` |
| 주문 (`/api/orders/bulk`) | MSW 핸들러 | `src/mocks/handlers/orders.ts` |

상품은 2026-09-01에 Neon으로 이전되면서 MSW 핸들러가 제거됐습니다. **전략 함수와 `getExcelSaveStrategy`는 그대로입니다** — 바뀐 것은 api 함수가 도달하는 곳뿐입니다.

상품 bulk route에서 엑셀 경로에 영향을 주는 두 가지:

- **`productId`를 서버가 다시 채번합니다.** 전략이 만든 값은 버려집니다(교차 테넌트 PK 충돌 방지). 클라이언트 채번을 신뢰하는 코드를 쓰지 마세요.
- **`mainImage`는 본인 네임스페이스의 R2 key여야 합니다.** 엑셀의 외부 이미지 주소는 저장 전략이 `/api/products/image/import`로 가져와 key로 바꾼 뒤 보냅니다 — 절대 URL은 거부됩니다.
- **오류 응답은 `{ error, rowIndex }`입니다.** `rowIndex`는 요청 배열 기준 0부터이고, `bulkCreateProducts`가 시트 행 번호로 바꿔 `[4행] 사유`를 만듭니다. api 함수와 `onError`에서 서버 메시지를 고정 문구로 덮지 마세요.
- **한 번에 최대 50건**(`PRODUCT_BULK_MAX_ROWS`)입니다. 넘으면 `400`입니다.
- **`customerCode`를 정규화하고 중복을 거부합니다.** 정규화 전에 문자열·숫자가 아닌 값은 첫 위반 행의 `{ error, rowIndex }`로 400입니다. 요청 안 중복과 기존 데이터 중복 모두 첫 위반 행의 `{ error, rowIndex }`로 400입니다. 검사 뒤 동시 저장으로 DB 인덱스에 걸리면 `rowIndex` 없이 400입니다.

```ts
// 주문 대량 등록 (MSW 유지)
http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
  await delay(500);
  const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Omit<Order, 'ownerId'>[] };
  MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
  return HttpResponse.json({ success: true, count: orders.length });
}),
```

**delay(500)은 이제 race condition 회피용이 아닙니다.** 예전에는 `AlertProvider`의 200ms 닫힘 타이머가 성공 alert의 options를 지워버려 MSW의 즉시 응답과 충돌했지만, 지금은 `AlertProvider.tsx`가 `clearTimerRef`로 `showAlert` 시점에 타이머를 취소해 근본 해결된 상태입니다. 남은 `delay`는 네트워크 지연을 흉내내는 용도일 뿐이므로, 새 핸들러에 이 값을 "필수"라고 여겨 복붙하지 마세요.

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
- ~~AlertProvider의 `setTimeout` race condition~~ → `useRef`(`clearTimerRef`)로 타이머를 관리하는 방식으로 **해결 완료**
