## Excel 처리 구조 가이드

이 문서는 엑셀 업로드/미리보기/제출 과정을 기능 스코프 상태(Jotai)로 운용하는 기준을 정리합니다.

### 목표

- 여러 화면(products/bulk, order/register, products/sku 등)에서 공통 Excel 플로우를 재사용
- 전역 오염 없이 필요한 화면 트리에서만 상태를 유지(기능 스코프 Provider)
- 무한 렌더, 메모리 상주, 대용량 반응성 문제 방지

---

## 아키텍처 개요

- 상태 저장소: `src/store/excelDataStore.ts`
  - `excelDataAtom`: 업로드 상태(데이터, 업로드 여부, 시간)
  - `setExcelDataAtom`: 업로드 완료 시 상태 설정
  - `useExcelData()`: 업로드 데이터 조회
  - `useResetExcelData()`: 상태 초기화 훅

- UI 컴포넌트: `src/components/excel/*`
  - `ExcelUploader`: 파일 업로드/파싱 트리거
  - `ExcelDataPreview`: 요약/오류/테이블 미리보기
  - `ExcelDownloader`: 템플릿/샘플 다운로드

- 기능 스코프 Provider: `ExcelProvider`
  - 특정 페이지/레이아웃 트리에서만 Jotai Store 제공

---

## 상태 설계

```ts
// excelDataStore.ts 핵심
export interface ExcelDataState<T = Record<string, unknown>> {
  data: T[];
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
- 전역에는 “최소 정제 데이터”만 저장(원본/에러 상세 등 대용량은 화면 스코프 보관)

---

## 기능 스코프 Provider

```tsx
// src/components/excel/ExcelProvider.tsx (예시)
'use client';
import { Provider as JotaiProvider } from 'jotai';

export function ExcelProvider({ children }: { children: React.ReactNode }) {
  return <JotaiProvider>{children}</JotaiProvider>;
}
```

적용 위치 권장

- Excel을 사용하는 각 페이지/레이아웃의 루트 컴포넌트
- 예: `products/bulk`, `order/register`, `products/sku` 페이지 컴포넌트

---

## 페이지 적용 예시

```tsx
// src/app/(authenticated)/products/bulk/page.tsx (예시)
'use client';
import { ProductBulkUploadLayout } from '@/features/products/ui/bulk/ProductBulkUploadLayout';
import { ExcelProvider } from '@/components/excel/ExcelProvider';

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

3. 제출 시 서버 전송 포맷으로 변환하여 전송

```ts
// 필요 시 rows -> payload 변환 후 API 호출
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

## 타입/검증 가이드

- 업로드된 로우 타입은 화면 도메인 타입으로 변환하여 저장(예: `ProductExcelPreviewRow`)
- `ExcelDataPreview<T>`는 제네릭으로 동작하되, 내부 `useExcelData()` 반환값을 `T[]`로 안전히 매핑
- 검증 로직은 화면별 유효성 기준에 맞춰 분리 구현

---

## 테스트 체크리스트

- 업로드 후 미리보기 정상 렌더 및 카운트 노출
- 라우트 이동/새로고침 시 상태 초기화 확인
- 초기화/재업로드 버튼 동작 확인
- 무한 렌더/성능 이슈(프레임 드랍, 메모리 누수) 부재 확인
- 다중 페이지에서 연속 사용 시 데이터 충돌 없음 확인

---

## 향후 확장

- 필요 시 세션/로컬스토리지 또는 URL 파라미터로 얕은 영속화 제공
- 페이지별 독립 Store를 사용해 서로 다른 업로드 세션 병행 가능
