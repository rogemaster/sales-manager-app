# 상품 외부 쇼핑몰 등록 전송 UI 설계

- 작성일: 2026-07-28
- 수정일: 2026-07-29 — API 아키텍처 방향 수정 (외부 몰 전송 게이트웨이 모델로 전환)
- 목적: "몰 고유 항목" 라운드(`2026-07-21-mall-specific-registration-fields-design.md`)에서 오픈 이슈 3번으로 이관됐던 "상품을 외부 쇼핑몰(네이버 스마트스토어·카카오 등)에 등록 전송하는 액션 UI"를 설계한다.
- 구현 상태: PR #35로 구현 완료

> **후속 스펙에서 뒤집힌 결정** — 아래 세 가지는 `2026-07-29-mall-registration-send-result-design.md`에서 변경됐다. 이 문서는 PR #35 시점의 기록으로 남긴다.
>
> 1. `registeredMalls`의 append 이력 모델 → **조합 단위 upsert(현재 상태)**
> 2. 전송 응답의 per-item `results` 배열 → **제거** (집계 카운트만 반환)
> 3. staging 초기화 3분기(전체실패 시 유지) → **항상 전체 초기화**

## 배경

`ShoppingSetting` 쪽(몰별 고유 필드 입력)은 PR #32로 완료됐지만, "상품을 외부 쇼핑몰(네이버 스마트스토어·카카오 등)에 실제로 전송 등록"하는 화면 자체는 존재하지 않았다. `Product.registeredMalls` 타입도 이 이유로 의도적으로 미추가 상태였다 (YAGNI — 쓸 곳이 없어서).

### 도메인 명확화

- **"몰 등록"의 의미**: 우리 시스템 DB에 데이터를 저장하는 것이 아니라, 옥션·지마켓·11번가·네이버 스마트스토어·쿠팡·카카오 등 **외부 쇼핑몰의 상품등록 API를 호출해 전송**하는 행위다.
- **전송 주체는 백엔드**: 외부 몰 API는 API Key 인증이 필요하고 브라우저 CORS를 허용하지 않으므로, 프론트엔드가 직접 호출하는 것은 불가능하다. 우리 백엔드가 게이트웨이 역할을 담당한다.
- **현재 구현 범위**: 백엔드가 미구현이므로, MSW가 "백엔드 → 외부 몰 API 호출 후 결과 반환" 전체를 시뮬레이션한다.

## 스코프

**이번 라운드에서 하는 것:**
- 신규 화면(`/shopping/register`)에서 상품을 여러 몰-설정 조합에 등록(전송)하는 전체 플로우
- `Product.registeredMalls` 타입 확정 및 실제 추가
- 등록(전송) bulk API 및 MSW 핸들러

**이번 라운드에서 하지 않는 것 (다음 라운드로 이관):**
- 브랜드/모델명/모델번호/제조업체 등 상품 공통 필드를 `Product`에 추가하는 작업 — 아래 "결정 사항" 참고
- `registeredMalls`가 참조하는 `shoppingSettingId`가 삭제됐을 때의 정합성 처리
- Excel 대량등록에 이 등록 액션 반영 여부
- 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사

## 결정 사항 (2026-07-21 스펙 대비 변경점)

기존 스펙(`2026-07-21-mall-specific-registration-fields-design.md`)은 `MallRegistration`에 몰별 `attributes`(네이버: `brand`/`modelName`/`modelId`, 카카오: `giftBrandId`/`manufacturer`)를 포함시켰다. 이번 라운드에서 재검토한 결과:

- 이 값들은 몰마다 이름만 다를 뿐 **몰 구분 없는 상품 자체의 공통 정보**(브랜드/모델명/모델번호/제조업체)다.
- `ShoppingSetting.mallSettings`(A/S정보·구매평노출·인증정보 등)와는 성격이 다르다 — `mallSettings`는 계정/설정 단위로 재사용되는 값이고, 이 값들은 상품마다 다르다.
- 따라서 이 필드들은 **`Product`의 공통 필드로 별도 라운드에서 추가**하기로 하고, 이번 등록 액션 UI에서는 속성 입력 없이 몰+설정 선택만으로 등록을 완결한다.
- 이에 따라 `MallRegistration` 타입에서 `attributes` 필드는 폐기한다.

## 데이터 모델

### 스테이징 상태 (화면 임시 상태, 서버 저장 안 함)

```ts
// src/features/mallRegistration/store/registration.store.ts
export interface StagedRegistration {
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
}

export const stagedRegistrationsAtom = atom<Record</* productId */ string, StagedRegistration[]>>({});
export const selectedProductIdsAtom = atom<string[]>([]);
export const isRegisterModalOpenAtom = atom<boolean>(false);
```

- Provider로 스코프하지 않는다 (Excel 패턴과 달리 이 화면은 단일 진입점이라 격리 이점이 없음). `shoppingSetting/store/search.store.ts`와 동일한 plain atom 모듈 패턴.
- 페이지 언마운트 시 및 전송 성공 시 전체 초기화한다.

### 영속 데이터 (`Product.registeredMalls`)

```ts
// src/features/products/types/product.types.ts
export interface MallRegistration {
  id: string;              // 등록 이력 고유 id — 동일 몰+설정 반복 등록을 허용하므로 dedup 키가 아니라 이력 식별자
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  registeredAt: string;    // 전송(등록) 처리 시각
}

export interface Product {
  // ...기존 필드 변경 없음
  registeredMalls?: MallRegistration[];
}
```

- 같은 상품을 같은 몰-설정 조합으로 여러 번 등록할 수 있다 (재등록 시나리오 — 예: 재입고, 재노출). 그래서 배열은 매 전송마다 새 항목을 **append**하며, 이전 이력을 덮어쓰거나 중복을 제거하지 않는다.
- 이 화면은 `registeredMalls`의 기존 이력을 조회/표시하지 않는다 (스코프 밖 — 아래 "화면 구성" 참고).

## 화면 구성

### 라우트 & 사이드바

- 신규 라우트: `/shopping/register`
- `src/constant/sidebarMenu.constant.ts`의 `쇼핑몰관리` 그룹에 `쇼핑몰 상품등록` 항목 추가 (`쇼핑몰 계정관리`, `쇼핑몰 정보설정`과 나란히)

### 컴포넌트 트리

```
src/app/(authenticated)/shopping/register/page.tsx
  MallRegistrationLayout                     (src/features/mallRegistration/ui/)
    MallRegistrationHeaderSection            제목/설명
    MallRegistrationSearchFilterSection      상품 검색 (기존 ProductListSearchFilterSection 패턴 재사용)
    MallRegistrationActionSection            "선택 N개" · [쇼핑몰등록] 버튼 · [쇼핑몰 전송] 버튼
    MallRegistrationTableSection
      MallRegistrationTable                  체크박스 + 상품정보 컬럼 + 스테이징 배지 영역
      TablePagination
    MallSelectModal                          몰 다중선택 → 몰별 설정 선택 → 완료
```

- 상품 목록 데이터는 기존 `getProducts` API를 그대로 재사용한다 (검색/페이지네이션 포함).
- `MallRegistrationTable`은 기존 `ProductTableBody`의 컬럼(상품명 등)을 유지하되, 체크박스 컬럼과 배지 영역을 추가한 신규 컴포넌트로 만든다 (기존 테이블은 체크박스/배지 슬롯이 없어 그대로 재사용 불가).

### 등록 플로우

1. 사용자가 `MallRegistrationTable`에서 상품 여러 건을 체크 (`selectedProductIdsAtom`)
2. `MallRegistrationActionSection`의 `[쇼핑몰등록]` 클릭 → 체크된 상품 없으면 alert 경고, 있으면 `isRegisterModalOpenAtom` true
3. `MallSelectModal` 1단계: 몰(mallCode) 다중선택 — `isActive: true`인 `ShoppingSetting`이 1건 이상 존재하는 몰만 노출 (2단계에서 선택지가 0개인 막다른 상황을 막기 위해, 노출 기준을 2단계와 동일한 "활성 설정 존재 여부"로 맞춘다)
4. `MallSelectModal` 2단계: 선택된 몰마다 서브섹션이 열리고, 해당 몰의 `isActive: true`인 설정 중 라디오로 1개 선택
5. `완료` 클릭 → 모달 오픈 시점의 `selectedProductIdsAtom` 상품 전체에 대해, 선택된 (몰, 설정) 조합들을 `stagedRegistrationsAtom`에 append → 모달 닫힘 → `selectedProductIdsAtom` 초기화 (체크박스 해제, 다음 배치 선택 준비)
6. 리스트의 각 상품 행 하단에 스테이징된 배지(`스마트스토어 - 기본설정 ✕`)가 표시됨. 상품 하나에 여러 배지 가능. `✕` 클릭 시 해당 조합만 개별 취소
7. 2~6을 원하는 만큼 반복(다른 상품 세트를 선택해 다른 몰에 배지 추가 가능)
8. `MallRegistrationActionSection`의 `[쇼핑몰 전송]` 클릭 → 체크박스 선택 상태와 무관하게, **현재 스테이징된 모든 배지**를 대상으로 전송. 스테이징이 하나도 없으면 alert 경고
9. 전송 API 응답 수신 후 per-item 결과를 표시한다:
   - **전체 성공**: staging 전체 초기화 + 성공 alert (`"N개 상품, 총 M건 전송 완료"`)
   - **부분 실패**: staging 전체 초기화 + 결과 요약 표시 (`"M건 성공 / K건 실패"` + 실패 항목 목록). 실패 항목 재시도는 사용자가 다시 배지를 추가하는 방식으로 처리 (staging 재구성)
   - **전체 실패**: staging 유지 (재시도 가능) + 실패 alert

## API

### 몰별 설정 목록 조회 (모달용)

- 신규 함수 `getAllShoppingSettings()` — 기존 `getShoppingSettings`는 페이지네이션/필터 전용이라, 모달에서 필요한 "전체 조회 + `mallCode`별 그룹핑 + `isActive` 필터"에는 별도 함수로 분리한다.
- MSW 핸들러는 기존 `shoppingSettings.ts`에 라우트만 추가하고, 로직(`ownerId` 필터 + `isActive` 필터 + `mallCode` 그룹핑)은 `mocks/utils/`로 위임한다.

### 등록 전송

- `POST /api/products/mall-registration`
- **역할**: 프론트 → 우리 백엔드 게이트웨이 엔드포인트. 실제 백엔드는 이 요청을 받아 각 외부 쇼핑몰 API를 1건씩 순차/병렬 호출한 뒤 집계 결과를 반환한다. 현재는 MSW가 이 전체 흐름을 시뮬레이션한다.
- Request body: `{ productId: string; mallCode: ShoppingMalls; shoppingSettingId: string }[]`
- Response:
  ```ts
  {
    totalCount: number;
    successCount: number;
    failCount: number;
    results: {
      productId: string;
      mallCode: ShoppingMalls;
      shoppingSettingId: string;
      status: 'success' | 'failed';
      externalId?: string;      // 성공 시 외부몰이 부여한 상품 ID (시뮬: 랜덤 문자열)
      errorMessage?: string;    // 실패 시 사유 (시뮬: 몰별 대표 오류 메시지)
    }[];
  }
  ```
- **MSW 시뮬레이션 동작**:
  - 성공한 항목만 `MOCK_PRODUCT_DATA`의 해당 상품 `registeredMalls`에 append (`{ id, mallCode, shoppingSettingId, registeredAt }`)
  - 실패율 약 10% (랜덤) — 현실적인 외부 API 오류 시나리오 재현
  - 실패 사유는 mallCode별로 대표 메시지 고정 (예: `NSST` → `"카테고리 매핑 오류"`, `KAKAOS` → `"상품명 글자 수 초과"`)
  - `delay(800)` — 외부 몰 API 응답 지연 시뮬레이션
  - 로직은 `mocks/utils/registerProductsToMalls.ts`로 위임

## 초기화 시점

- 페이지 언마운트 시 `stagedRegistrationsAtom`/`selectedProductIdsAtom` 전체 초기화 (excel.md의 언마운트 cleanup 패턴과 동일)
- 전송 완료 후 초기화 기준:
  - 전체 성공 / 부분 실패 → staging 전체 초기화 (실패 항목 재시도는 배지 재추가로 처리)
  - 전체 실패 → staging 유지 (사용자가 수정 없이 재시도 가능)

## 영향받지 않는 것

- `ShoppingSetting`, `ShoppingSetting.mallSettings` 구조는 변경 없음
- 기존 `Product` 필드는 변경 없음, `registeredMalls`는 optional 신규 필드라 기존 데이터 마이그레이션 불필요

## 다음 라운드로 넘기는 오픈 이슈

1. 브랜드/모델명/모델번호/제조업체 등 상품 공통 필드를 `Product`에 추가 (규정 정보 필드가 추가됐던 `ProductComplianceSection` 패턴 참고 가능)
2. `registeredMalls`가 참조하는 `shoppingSettingId` 삭제 시 정합성 처리
3. Excel 대량등록에 이 등록 액션 반영 여부
4. 제외된 몰(쿠팡/지마켓·ESM/오늘의집/무신사 등) 재조사
