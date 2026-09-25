## Excel 처리 구조 가이드

엑셀 양식 다운로드 → 업로드 → 미리보기 → 저장 흐름을 여러 화면에서 재사용하기 위한 기준이다. 구현 코드는 옮겨 적지 않는다 — 아래 `파일:심볼`을 열어 본다.

---

## 구성 요소

| 역할 | 위치 |
|------|------|
| 상태 | `src/components/excel/store/excelData.store.ts` — `excelDataAtom`(atomWithReset), `setExcelDataAtom`, `useExcelData`, `useResetExcelData` |
| 타입 | `src/types/excel.type.ts` — `ExcelTemplateInfo`, `ExcelRowWithErrors`, `ValidationError`, `UploadResult`, `ExcelSaveFn`/`ExcelSaveResult` |
| 업로드 | `ExcelUploader` → `ExcelUploaderContent`(파일 입력, `processExcelUpload` 호출, `setExcelDataAtom`) |
| 다운로드 | `ExcelDownloader` → `ExcelTemplateButton`(`excelDownload`), `ExcelTemplateInfo` |
| 미리보기·저장 | `ExcelDataPreview` — 요약·오류 알림·테이블 + React Query mutation으로 저장. 서브 컴포넌트는 `src/components/excel/components/` |
| 업로드 처리 | `utils/processExcelUpload.ts` — 파싱(`readSheetRows`) → 시트 행 번호 부여 → 행 수 제한 → 필드 검증(`validateExcelData`) |
| 업로드 후 서버 확인 | `utils/checkExcelUniqueCodeColumns.ts`(코드 중복), `utils/checkExcelImageColumns.ts`(이미지 주소) |
| 저장 | `utils/getExcelSaveStrategy.ts` — 전략(`strategies/`) + API 호출을 합성한 `ExcelSaveFn` 반환 |
| 메시지 | `message.ts` — 업로드 오류 코드·검증 오류 → 한글 메시지 |
| 기능 스코프 Provider | `src/components/providers/ExcelProvider.tsx` |

도메인별 상수는 `src/features/<domain>/constant/`에 둔다 — 템플릿 컬럼 정의(`bulkTemplate.constant.ts`의 `ExcelTemplate` — `{ templateTitle, template: ExcelTemplateInfo[] }`)와 미리보기 테이블 컬럼(`excel.constants.tsx`).

---

## 상태 규칙

- 파생 atom(`selectAtom`)은 **모듈 스코프에서 1회 생성**한다. 훅 안에서 만들면 매 렌더 새 atom이 되어 무한 렌더가 난다.
- 전역에는 최소 정제 데이터(`ExcelRowWithErrors[]`)만 둔다. 검증 오류는 같은 행 객체의 키로 담아 미리보기에서 인라인 표시한다.
- **초기화는 두 곳 모두 한다** — 화면 언마운트 시(`useEffect(() => reset, [reset])`, 예: `ProductBulkUploadLayout`)와 저장 성공 알림 확인 시(`onConfirm: resetExcelData`). 잔존 데이터가 다른 업로드와 섞이지 않게 하기 위해서다.
- 네트워크용 포맷 변환은 저장 직전 전략에서만 한다.

### 기능 스코프 Provider의 제약

`ExcelProvider`(jotai `<Provider>`)로 Excel 화면 트리를 감싼다. 현재 적용: `products/bulk/page.tsx`.

**이 패턴은 자기 완결적 기능 상태에만 쓴다.** `<Provider>`는 하위 트리에 새 store를 만들어 그 트리가 읽는 **모든 atom**을 초기값으로 되돌린다. auth 정보는 `(authenticated)/layout.tsx`가 전역 store에 주입하므로, 감싼 트리에서는 `workspaceOwnerIdAtom`이 `''`이 되어 `enabled: !!workspaceOwnerId` 쿼리가 에러도 요청도 없이 영구 비활성화된다. `products/bulk`가 괜찮은 것은 운이 섞여 있다 — 그 트리의 `ExcelDataPreview`도 `workspaceOwnerIdAtom`을 읽어 `''`을 받지만, 쿼리 게이팅에 쓰지 않고 상품 bulk route가 `ownerId`를 세션에서 꺼내 무시하기 때문이다. **주문(`ORDER`) 저장은 이 값을 MSW로 보내므로, 주문 엑셀 화면을 `ExcelProvider` 안에 만들면 빈 `ownerId`로 저장된다.** 화면 간 상태 격리 용도로는 쓸 수 없다 — [`scoped-jotai-provider-breaks-auth-atoms.md`](../../docs/solutions/architecture-patterns/scoped-jotai-provider-breaks-auth-atoms.md)

---

## 템플릿 컬럼 속성 (`ExcelTemplateInfo`)

| 속성 | 의미 |
|------|------|
| `req` | 필수 컬럼. 빠지거나 비면 `MISSING_FIELD`·`EMPTY_VALUE` |
| `allowed` | 적을 수 있는 **표시명** 목록. 목록 밖이면 `INVALID_VALUE`. 목록은 화면 Select가 쓰는 상수에서 파생한다(예: `PRODUCT_STATUS.map(({ name }) => name)`) |
| `numeric` | 다운로드 양식의 숫자 서식이자, 업로드 시 0 이상 정수 검증(`INVALID_NUMBER`). 현재 숫자 컬럼(공급가·판매가·배송비·총수량)이 전부 같은 규칙이라 표시 하나로 충분하다 — 다른 규칙이 필요한 숫자 컬럼이 생기면 그때 표현을 늘린다 |
| `remoteImage` | 외부 이미지 주소 컬럼. 업로드 시 `/api/products/image/check`로 확인만 하고 실패 행을 `INVALID_IMAGE`로 잡는다. **R2에 저장하지 않는다** — 사용자가 저장하지 않고 초기화하면 파일만 남는다. 실제 가져오기는 저장 전략이 한다. 빈 값은 확인하지 않고, 필드 오류가 있는 행도 확인한다 |
| `uniqueCode` | 워크스페이스 안에서 겹치면 안 되는 코드(현재 `고객상품코드`뿐). 파일 안 중복은 묶음의 **모든 행**을 `DUPLICATE_IN_FILE`로, 기존 코드와의 중복은 `/api/products/customer-code/check` 1회 호출로 `DUPLICATE_EXISTING`, 확인 실패는 `CODE_CHECK_FAILED`. 비교는 공백·대소문자 무시 |

- **`uniqueCode`는 100자 초과 코드를 먼저 `INVALID_CODE`로 잡고 확인 대상에서 뺀다.** 확인 API에 보내면 요청 전체가 400이 되어 모든 행이 `CODE_CHECK_FAILED`가 된다.
- **서버 확인 순서는 필드 검사 → 코드 중복 → 이미지다.** 코드 중복을 저장이 아니라 업로드에서 거르는 것은 이미지를 R2에 받기 전에 빼야 고아 파일이 생기지 않기 때문이다.
- **`maxRows`(업로더 prop)** 를 넘기면 초과 파일을 `TOO_MANY_ROWS`로 거부한다. 상품은 `PRODUCT_BULK_MAX_ROWS`(50)를 넘기고 bulk route도 같은 상수로 한 번 더 거부한다.

---

## 셀 값은 글자로 읽는다 — 숫자 컬럼만 예외

`readSheetRows`(`sheetRows.ts`)는 `numeric`이 아닌 칸을 **화면에 보이는 글자**(`raw: false`)로, 숫자 컬럼만 원래 값으로 읽는다.

- `sheet_to_json` 기본값(원래 값)은 셀 타입을 그대로 넘긴다. 다운로드 양식은 글자 컬럼에 텍스트 서식(`@`)을 걸지만, 직접 만든 파일·"일반" 서식 칸·**CSV**에서는 `TRUE`가 불리언이, `00123`이 숫자 123이 되어 **값이 조용히 바뀐다.**
- 숫자 컬럼까지 글자로 읽으면 쉼표 서식이 `"1,000"`이 되어 숫자 검증에 걸리므로 나눠 읽는다.

## 행 번호 — 엑셀 시트 행으로 통일

미리보기 '행' 컬럼, 검증 오류의 `row`, 저장 결과 알림, bulk route 오류가 **전부 엑셀 시트 행 번호**다. 사용자가 파일에서 그 행을 바로 찾을 수 있어야 하기 때문이다.

- 파싱 직후 `attachSheetRowNumbers`가 `EXCEL_SHEET_ROW_KEY`로 번호를 붙이고, 이후 모든 층은 `getSheetRow(row)`로 읽는다. **index로 계산하지 않는다.**
- `sheet_to_json`은 빈 행을 건너뛰어 `index + 2`가 틀린다. SheetJS의 `__rowNum__`은 열거 불가 속성이라 `{ ...row }`에서 사라진다 — 반드시 **펼치기 전에** 복사한다.
- bulk route는 시트를 모른다. 오류를 `{ error, rowIndex }`(요청 배열 기준 0부터)로 돌려주고, `bulkCreateProducts`가 `formatBulkRowError`로 `[4행] 사유`를 만든다.

---

## 저장 — 전략 + API 합성

`getExcelSaveStrategy(type, ownerId)`가 타입별 `ExcelSaveFn`을 돌려준다. 전략 함수(`strategies/*ExcelSaveStrategy.ts`)는 `(rows: ExcelRowWithErrors[]) => DomainType[]`로 한글 키를 도메인 필드로 완전 변환한다. 새 도메인은 전략 함수 추가 + `case` 분기 추가로 끝낸다.

**상품(`PRODUCT`)** — `productExcelSaveStrategy` → `resolveExcelMainImages`(외부 이미지를 `/api/products/image/import`로 R2에 가져와 key로 교체, 실패 행은 빼고 `failures`로 모음) → `bulkCreateProducts`.

- 이미지를 못 가져온 행을 빼고 저장하므로 **일부 성공이 정상 결과**다(`ExcelSaveResult = { savedCount, failures }`). 일부 실패는 `warning` 알림 후 초기화, 전부 실패는 오류로 올려 미리보기를 유지한다(다시 시도할 수 있게).
- 알림은 `formatExcelFailureSummary`로 **첫 오류(시트 행이 가장 작은 것) + `(외 N건 오류)`**만 보여준다. 서버가 보낸 오류 메시지를 api 함수·`onError`에서 고정 문구로 덮지 않는다.
- 저장 중에는 미리보기의 저장·초기화 버튼을 막고(중복 등록 방지), `ExcelSaveProgressDialog`(닫을 수 없는 모달)로 진행률을 보이며 `beforeunload` 경고를 켠다. `onProgress`는 이미지 단계에서만 알리므로 `done === total`을 상품 정보 저장 단계로 읽는다(`getExcelSaveProgressView`).

**주문(`ORDER`)** — `orderExcelSaveStrategy` → `bulkCreateOrders`(MSW `POST /api/orders/bulk`). 전략·API는 있지만 **`saveType="ORDER"`를 쓰는 화면이 없다**(`order/create`는 빈 자리표시 화면이고 메뉴에도 없다).

### 표시명을 `as`로 통과시키지 않는다

시트에는 사용자가 '판매중' 같은 표시명을 적는다. `as`는 컴파일 타임 캐스팅이라 런타임에는 한글이 그대로 남고, 저장 컬럼이 `text`라 DB도 거부하지 않는다 — 증상은 한참 뒤 목록 화면의 렌더 예외로 나타난다. 코드값만 허용되는 필드는 **양식에 `allowed`(검증) → 전략에서 `toCode`로 변환 → route에서 한 번 더 거부(강제)** 세 층으로 막는다 — [`display-label-to-domain-code-boundary.md`](../../docs/solutions/architecture-patterns/display-label-to-domain-code-boundary.md)

---

## bulk API 계약

| 도메인 | 처리 층 |
|--------|---------|
| 상품 `POST /api/products/bulk` | route handler (Neon + R2) — `src/app/api/products/bulk/route.ts` |
| 주문 `POST /api/orders/bulk` | MSW — `src/mocks/handlers/orders.ts` |

상품 bulk route가 엑셀 경로에 요구하는 것:

- **`productId`는 서버가 다시 채번한다.** 전략이 만든 값은 버려진다(교차 테넌트 PK 충돌 방지). 클라이언트 채번을 신뢰하는 코드를 쓰지 않는다.
- **`mainImage`는 본인 네임스페이스의 R2 key여야 한다.** 절대 URL은 거부된다.
- **한 번에 최대 50건**(`PRODUCT_BULK_MAX_ROWS`), 넘으면 400.
- **오류 응답은 `{ error, rowIndex }`**. `customerCode`는 정규화 전에 문자열·숫자가 아닌 값을, 정규화 후 요청 안 중복·기존 데이터 중복을 첫 위반 행으로 400 거부한다. 검사 뒤 동시 저장으로 DB 인덱스에 걸리면 `rowIndex` 없이 400이다.

주문 MSW 핸들러의 `delay(500)`은 네트워크 지연 흉내일 뿐이다. 예전 `AlertProvider` 닫힘 타이머 race는 `clearTimerRef`로 해결됐으므로 새 핸들러에 필수값처럼 복사하지 않는다.

---

## 구현 현황

| 기능 | 상태 |
|------|------|
| 상품 대량 등록 (`products/bulk`) | ✅ 완료 |
| 주문 대량 등록 전략·API (`orderExcelSaveStrategy`, MSW) | ✅ 있음 — 쓰는 화면 없음 |
| 주문 대량 등록 화면 (`order/create`) | ⬜ 미구현 (빈 자리표시) |
