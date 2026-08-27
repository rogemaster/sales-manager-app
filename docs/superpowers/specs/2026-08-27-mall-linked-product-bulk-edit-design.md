# 쇼핑몰 연동 상품 목록 — 액션 버튼 영역 및 일괄수정 설계

- 작성일: 2026-08-27
- 대상 화면: `/shopping/linked-products`
- 관련 문서: [`.claude/rules/domain-design.md`](../../../.claude/rules/domain-design.md), [`.claude/rules/ui-conventions.md`](../../../.claude/rules/ui-conventions.md), [`.claude/rules/msw-rules.md`](../../../.claude/rules/msw-rules.md), [`2026-08-03-mall-linked-product-edit-resend-design.md`](2026-08-03-mall-linked-product-edit-resend-design.md)

## 배경

연동 상품 목록에는 지금 액션 영역이 없다. '선택 재전송' 버튼 하나가 테이블 카드 헤더 안에 `전체 N건`과 나란히 있어 다른 목록 화면(`/shopping/settings`, `/shopping/register`, `/order/list` 등)과 포맷이 다르다.

또한 연동 데이터를 여러 건 한꺼번에 고칠 수단이 없다. `MallLinkedProduct`는 오리지널 상품·설정과 독립된 스냅샷이라 오리지널을 고쳐도 전파되지 않으므로(`domain-design.md`), 이미 만들어진 연동 30건의 값을 바꾸려면 개별 수정 화면에서 30번 반복해야 한다.

이 두 가지를 함께 해소한다.

## 범위

목록 화면 검색필터와 테이블 사이에 액션 버튼 영역을 추가하고, 버튼 3개를 배치한다.

| 버튼 | 동작 |
|------|------|
| 선택 재전송 | 기존 로직을 테이블 카드 헤더에서 이 영역으로 **이동**. 동작 변경 없음 |
| 상품정보수정 | 별도 라우트 화면에서 상품 값을 **필드 단위로 부분 수정** |
| 쇼핑몰정보수정 | 모달에서 기존 쇼핑몰 정보설정을 골라 **스냅샷 통째 교체** |

**범위 밖:** 연동 데이터 삭제, 일괄 재전송 정책 변경, 오리지널에서 연동 데이터로의 값 전파.

---

## 1. 액션 버튼 영역

### 컴포넌트

`src/features/mallLinkedProduct/ui/MallLinkedProductActionSection.tsx` (신규)

`MallLinkedProductLayout`에서 `MallLinkedProductSearchFilterSection`과 `MallLinkedProductTableSection` 사이에 배치한다.

```tsx
<div className="flex items-center gap-3 py-1">
  <span className="min-w-16 text-sm text-muted-foreground">
    선택 <span className="font-medium text-foreground">{selectedLinkedIds.length}</span>개
  </span>
  <Button size="sm" onClick={handleResend} disabled={isPending || selectedLinkedIds.length === 0}>
    선택 재전송
  </Button>
  <Button variant="outline" size="sm" onClick={handleProductBulkEdit}>상품정보수정</Button>
  <Button variant="outline" size="sm" onClick={handleSettingBulkEdit}>쇼핑몰정보수정</Button>
</div>
```

'선택 재전송' 버튼 라벨에는 기존과 같이 선택 건수를 괄호로 덧붙인다.

`ui-conventions.md`의 액션 영역 포맷(`ShoppingSettingActionSection`, `MallRegistrationActionSection`)을 그대로 따른다.

### '선택 재전송' 이동

`MallLinkedProductTableSection`에서 아래를 **통째로** 옮긴다. 로직 변경 없음.

- `useResendMallLinkedProducts` / `useAlert` / `selectedLinkedIdsAtom` 의존
- `handleResend` — 선택 0건 경고, 성공/부분실패 alert 분기, 결과와 무관하게 선택 비우기

이동 후 `MallLinkedProductTableSection`의 `CardHeader`에는 `전체 N건`만 남는다. Props는 그대로 유지한다.

---

## 2. 상품정보 일괄수정

### 라우트

```
/shopping/linked-products/bulk-edit/product
```

`[id]` 동적 라우트와 같은 depth에 정적 세그먼트를 두면 헷갈리므로 한 단계 내렸다. Next.js는 정적 세그먼트가 동적보다 우선이라 `bulk-edit`를 형제로 둬도 동작은 하지만, `msw-rules.md`가 이미 경고하는 종류의 충돌이라 피한다.

### 진입 조건

- 목록에서 선택이 0건이면 `'수정할 연동 상품을 선택해주세요.'` alert, 이동하지 않는다.
- 몰·계정이 섞여도 무방하다. 상품 값은 몰과 무관하다.
- 화면 진입 시 `selectedLinkedIdsAtom`이 비어 있으면(새로고침으로 전역 store가 초기화된 경우) `'선택 정보가 없습니다. 목록에서 다시 선택해 주세요.'` alert 후 목록으로 `router.replace`.

### 폼 값 구조

**값은 RHF 폼, 체크 상태는 별도 state로 분리한다.**

```ts
const valuesForm = useForm<Product>();  // flat 경로 — register('name'), useWatch({ name: 'option' })
const [checked, setChecked] = useState<Partial<Record<ProductBulkEditGroupKey, boolean>>>({});
```

체크 상태를 폼 안에 섞지 않고(`checked.name` / `values.name` 같은 중첩 경로를 쓰지 않고) 값 폼을 **`Product` 그대로의 flat 구조**로 두는 이유는, 기존 상품 폼 섹션들이 전부 `useFormContext<Product>()` + flat 경로를 전제로 만들어져 있기 때문이다. 이 구조를 유지하면 재사용 가능한 섹션을 그대로 쓸 수 있다(아래 "섹션 구성" 참고).

두 폼을 나란히 두는 것은 `MallLinkedProductEditLayout`이 이미 쓰는 구조다(`productForm` + `settingForm`).

### 체크 그룹

체크박스 1개가 여러 `Product` 키를 커버하는 경우가 있어(의존 필드), 그룹을 상수로 명시한다.

```ts
export const PRODUCT_BULK_EDIT_GROUPS = {
  customerCode:          ['customerCode'],
  name:                  ['name'],
  categoryId:            ['categoryId'],
  keyWords:              ['keyWords'],
  state:                 ['state'],
  netPrice:              ['netPrice'],
  price:                 ['price'],
  totalQuantity:         ['totalQuantity'],
  delivery:              ['deliveryType', 'deliveryPrice'],          // 배송비는 배송방법에 종속
  brand:                 ['brand'],
  manufacturer:          ['manufacturer'],
  modelName:             ['modelName'],
  modelId:               ['modelId'],
  originCountry:         ['originCountryCode', 'originCountryEtc'],  // 기타 입력은 코드에 종속
  taxType:               ['taxType'],
  adultProductType:      ['adultProductType'],
  detailPage:            ['detailPage'],
  option:                ['option', 'subOption'],                    // 섹션 단위 체크
  informationDisclosure: ['informationDisclosure'],                  // 섹션 단위 체크
} as const satisfies Record<string, readonly (keyof Product)[]>;

export type ProductBulkEditGroupKey = keyof typeof PRODUCT_BULK_EDIT_GROUPS;
```

`productId`·`ownerId`·`createDate`·`updateDate`는 일괄수정 대상이 아니므로 그룹에 없다.

**`mainImage`도 빠져 있다 (2026-08-27 최종 리뷰에서 제외 결정).** 상품 폼은 대표이미지를 `File` 객체로 폼에 넣는데, 요청 본문이 `JSON.stringify`를 거치면 `File`은 `{}`가 된다. `mainImage: string | File` 어느 쪽도 아닌 값이 선택한 모든 연동 건에 기록되므로, 체크박스의 설명("선택한 연동 상품 전부에 같은 이미지가 적용됩니다")을 지킬 수 없다. 이미지 업로드·저장소 방식이 정해진 뒤에 다시 넣는다.

- 같은 결함이 개별 수정 화면(`MallLinkedProductEditLayout`)에도 잠재해 있다. 거기서는 1건뿐이고 사용자가 파일을 직접 고른 경우에만 발생하므로 이번 범위에서 건드리지 않았다.
- CLAUDE.md의 미구현 기능 처리 방침("동작하지 않는 항목은 alert로 막지 말고 항목 자체를 삭제한다")을 따른 결정이다.

### 섹션 구성

수정 화면(`MallLinkedProductEditLayout`)의 8개 섹션 중 대표이미지를 뺀 **7개 섹션**을 둔다. 체크 단위에 따라 **5개는 새로 만들고 2개는 기존 컴포넌트를 재사용한다.**

| 섹션 | 체크 단위 | 구현 |
|------|----------|------|
| 기본정보 (고객사 상품코드·상품명·키워드·카테고리·판매상태) | 필드마다 | 새로 만듦 |
| 가격·수량 (공급가·판매가·총수량·배송) | 필드마다 | 새로 만듦 |
| 브랜드·모델 (브랜드·제조업체·모델명·모델번호) | 필드마다 | 새로 만듦 |
| 인증·과세 (원산지·부가세유형·성인상품여부) | 필드마다 | 새로 만듦 |
| 상세설명 | 필드마다 (섹션에 1개) | 새로 만듦 |
| 옵션 | 섹션 헤더 1개 — 체크 시 조합 배열 통째 교체 | **`ProductOptionSection` 재사용** |
| 정보고시 | 섹션 헤더 1개 — 폼에서 고른 카테고리 + 필드 통째 교체 | **`ProductInformationDisclosureSection` 재사용** |

### 왜 옵션·정보고시는 재사용하는가

아래 "재사용하지 않는 이유" 3가지가 이 두 섹션에는 걸리지 않는다.

1. **필수 검증** — `src/features/products/ui/components/options/` 전체에 `required` 규칙이 **0건**이다. 정보고시에는 있지만(카테고리 선택 + 카테고리별 필수 필드), 스펙상 `informationDisclosure`는 "체크했으면 값이 있어야 하는" 필수 필드이므로 그 검증이 **오히려 필요한 동작**이다.
2. **바인딩 경로** — 값 폼을 `useForm<Product>()` flat 구조로 두기로 했으므로 두 섹션이 기대하는 경로(`option`, `subOption`, `informationDisclosure.*`)가 그대로 성립한다.
3. **공유 오염** — `bulkMode` 같은 플래그를 넣지 않는다. 섹션은 그대로 두고, 체크박스를 가진 **래퍼 카드**로 감싸기만 한다.

**재사용의 실익:** `ProductOptionSection`은 `ProductOptionCard` + `ProductOptionConfirmTable` + `useProductOptionState`(시딩 로직 포함)로 이루어진 서브시스템이다. 새로 만들면 이 전부를 복제하게 되고 유지보수 지점이 둘로 갈라진다.

**감수하는 부작용:** `ProductOptionConfirmTable`의 '수량확정' 버튼이 `setValue('totalQuantity', ...)`를 호출한다. 총수량 체크박스가 꺼져 있어도 폼 값은 써지지만, `buildProductBulkPatch`가 체크된 그룹만 읽으므로 전송에는 실리지 않는다. 화면상 값이 바뀌어 보이는 것이 유일한 증상이다.

### 왜 나머지 6개는 재사용하지 않는가

1. **필수 검증이 컴포넌트 안에 박혀 있다.** `register('name', { required: '상품명을 입력해 주세요.' })` 형태라, 대부분의 값이 비어 있는 일괄수정 폼에서는 제출 자체가 막힌다. 풀려면 섹션마다 "필수를 끄는 모드"를 넣어야 한다.
2. **바인딩 경로 구조가 다르다.** 기존 섹션은 `register('name')` flat 경로에 값 하나를 쓴다. 일괄수정은 필드마다 `checked.<group>`과 `values.<key>` 두 경로를 다룬다.
3. **세 화면이 이 섹션들을 공유한다** — `/products/create`, `/products/[id]`, `/shopping/linked-products/[id]`. `bulkMode` 같은 플래그를 넣으면 그 플래그를 쓰지 않는 세 화면이 전부 거기 묶인다. 이 프로젝트는 같은 실패를 두 번 겪었다(`ui-conventions.md`의 "검색 필터는 화면이 소유한다", `domain-design.md`의 "설정 폼 섹션 3개는 세 화면이 공유한다" 경고).

**대신 공유하는 것 — 복제 금지:** 타입(`Product`, `OptionCombination`, `ProductInformationDisclosure`), Select/Radio 옵션 상수(`ORIGIN_COUNTRIES`, 판매상태·부가세유형·성인상품여부 등), 카테고리·고시카테고리 조회 훅.

**감수하는 비용:** `Product`에 새 필드가 생기면 수정 폼과 일괄수정 폼 **두 곳**을 고쳐야 한다. 위 3가지를 감수하는 것보다 낫다고 판단했다.

### 입력 규칙

- 체크 해제된 필드는 `pointer-events-none opacity-50` + `inert`로 감싸 조작을 막는다. **`disabled` 속성을 쓰지 않는 이유**는 래퍼 안에 입력이 아닌 요소(라벨·미리보기·뱃지)도 들어가기 때문이다. `inert`가 마우스·키보드·보조기술을 한 번에 덮는다.
- 개별 필드에 RHF `required` 규칙을 걸지 않는다. 대신 아래 두 규칙을 제출 직전에 한 번에 적용한다.
- **빈값 처리는 `Product` 타입의 optional 여부로 갈린다.**

| 구분 | 대상 | 체크 + 빈값일 때 |
|------|------|-----------------|
| optional (`?`) | `customerCode`, `netPrice`, `keyWords`, `modelName`, `modelId`, `originCountryCode`, `originCountryEtc`, `taxType`, `adultProductType`, `option`, `subOption` | **빈값으로 덮어쓴다** (= 지우기). 체크 자체가 "이 필드를 바꾸겠다"는 의사표시다 |
| 필수 | `name`, `categoryId`, `price`, `state`, `deliveryType`, `deliveryPrice`, `detailPage`, `totalQuantity`, `informationDisclosure`, `brand`, `manufacturer` | **제출을 막는다** — `'체크한 필수 항목의 값을 입력해 주세요.'` |

필수 필드를 막는 이유는 이 값들이 `undefined`가 되면 목록·수정 화면이 곧바로 깨지기 때문이다(예: `price.toLocaleString()`).

**"지우기"는 patch로 전달할 수 없다 — `clearKeys`로 따로 나른다.**
`JSON.stringify({ taxType: undefined })`는 `"{}"`다. 값이 `undefined`인 키는 요청 본문에서 통째로 사라지므로, patch에 담아 보내면 서버의 얕은 병합에 아무것도 도달하지 않는다. 그런데 화면에서 "비어 있는" 상태가 `undefined`로 나타나는 필드가 실제로 있다 — `netPrice`(`setValueAs`가 `''`를 `undefined`로 바꾼다), Controller로 등록된 `taxType`·`adultProductType`·`originCountryCode`, 그리고 `register`를 거치지 않는 `keyWords`가 그렇다.

그래서 **체크됐는데 값이 `undefined`인 키는 patch에서 빼고 `clearKeys` 배열에 담아 보낸다.** 서버가 병합 후 그 키들을 삭제한다. 빈 문자열(`''`)은 진짜 값이므로 patch에 그대로 실린다.

- 이 장치가 없으면 "부가세유형만 체크하고 아무것도 고르지 않은 채 저장" 같은 조작이 **아무것도 바꾸지 않은 채 "N건이 수정되었습니다"라고 보고한다.** 2026-08-27 최종 리뷰에서 발견됐다.
- `originCountryEtc`를 리셋할 때 `undefined`가 아니라 `''`를 쓰는 이유도 같다. `undefined`로 리셋하면 그 그룹이 체크된 경우에만 `clearKeys`를 타고, 체크되지 않았다면 아무 일도 일어나지 않아 낡은 값이 남는다.

- 숫자 입력은 `setValueAs: (v) => (v === '' ? undefined : Number(v))`로 받는다. `valueAsNumber`를 그대로 쓰면 빈 입력이 `NaN`이 되어 "비었다"와 "0"을 구분할 수 없다.

### 제출 시 검증 — `handleSubmit`을 쓰지 않는다

`valuesForm.handleSubmit`은 **등록된 모든 필드**를 검증한다. 재사용하는 정보고시 섹션에는 `required` 규칙이 있으므로, 체크하지 않은 정보고시 때문에 제출이 막힌다.

대신 체크된 그룹의 필드명만 모아 `valuesForm.trigger(names)`를 호출한다. `MallLinkedProductEditLayout`이 이미 `trigger()`를 직접 쓰는 방식과 같다.

```ts
const checkedFieldNames = collectCheckedFieldNames(checked); // (keyof Product)[]
if (!(await valuesForm.trigger(checkedFieldNames))) return;
```

### 제출 payload 생성

```ts
// src/features/mallLinkedProduct/util/buildProductBulkPatch.ts
// 체크된 그룹의 키 중 값이 있는 것만 담는다. 값이 undefined인 키는 collectClearKeys가 가져간다.
export const buildProductBulkPatch = (
  values: Partial<Product>,
  checked: Partial<Record<ProductBulkEditGroupKey, boolean>>,
): Partial<Product>;

// 체크됐지만 값이 undefined인 키 — "이 필드를 비운다"는 의사표시를 patch와 분리해 나른다
export const collectClearKeys = (
  values: Partial<Product>,
  checked: Partial<Record<ProductBulkEditGroupKey, boolean>>,
): (keyof Product)[];

// 체크된 그룹이 커버하는 Product 키를 평탄화해 돌려준다 — trigger()에 넘길 목록
export const collectCheckedFieldNames = (
  checked: Partial<Record<ProductBulkEditGroupKey, boolean>>,
): (keyof Product)[];
```

`checked[group] === true`인 그룹의 키만 골라 `Partial<Product>`를 만든다. 둘 다 순수 함수이며 테스트 대상이다.

### 하단 버튼

`취소` / `수정`. 재전송은 목록의 '선택 재전송'으로 분리한다 — `domain-design.md`의 "저장과 재전송은 별개 액션" 원칙을 따른다.

---

## 3. 쇼핑몰정보 일괄수정

### 형태

모달. 별도 라우트를 두지 않는다.

### 진입 조건

선택 건들의 `mallCode`와 `settingSnapshot.mallAccountId`가 각각 하나로 모이지 않으면 `'동일한 쇼핑몰·쇼핑몰계정만 선택해 주세요.'` alert 후 모달을 열지 않는다. 선택 0건이면 `'수정할 연동 상품을 선택해주세요.'`.

**왜 이 제약이 필요한가:** 설정 값은 몰·계정에 종속된다. 출고지·반품지는 `mallCode` + `mallId`로 그 계정의 주소록에서 고른 값이라 다른 계정 건에 넣으면 외부몰에서 실패하고, 몰 고유정보(`mallSettings`)는 몰마다 필드 자체가 다르다. `domain-design.md`상 `mallCode`·`mallAccountId`·`mallId`는 애초에 수정 대상이 아니다.

선례: 설정 목록의 '정보일괄설정'도 몰이 섞이면 `'동일한 쇼핑몰만 선택해 주세요.'`로 막는다.

### 모달 내용

`getActiveShoppingSettings(ownerId)`(`POST /api/shopping/settings/active`)의 결과 `ActiveShoppingSettingOption[]`을 **선택 건의 `mallCode` + `mallAccountId`로 좁혀** 목록으로 보여준다. 표시는 `nickname` · `mallId`. 하나를 고르고 '적용'을 누른다.

해당 조건의 활성 설정이 0건이면 `'이 쇼핑몰계정에 사용 가능한 정보설정이 없습니다.'` 안내를 띄우고 적용 버튼을 비활성화한다.

### 적용 방식 — 서버가 원본을 읽어 복사한다

클라이언트는 `shoppingSettingId` 하나만 보낸다. 서버가 오리지널 `ShoppingSetting`을 읽어 `structuredClone`으로 `settingSnapshot`을 만든다.

이는 **생성 흐름과 같은 책임 분담**이다. `domain-design.md`가 짚은 대비를 그대로 따른 것이다.

> 생성(`createMockMallLinkedProducts`)은 클라이언트가 `{ productId, mallCode, shoppingSettingId }`만 보내고 서버가 원본에서 읽어 스냅샷을 복사하므로 어긋날 여지가 없다. 반면 수정은 클라이언트가 완성된 스냅샷을 보내고 서버가 불변 필드를 지켜내는 방식이라, 지켜내는 범위가 곧 이 규칙의 실효 범위다.

즉 일괄수정이라는 파급이 큰 연산을, 클라이언트가 스냅샷을 조립하는 위험한 경로가 아니라 생성과 같은 안전한 경로로 처리한다.

### 함께 갱신하는 것 — `sourceShoppingSettingId`

설정 스냅샷을 통째로 갈아끼우면 top-level `sourceShoppingSettingId`(출처 표시)도 새 설정 id로 갱신한다.

**이유:** 목록의 **정보설정 필터는 top-level `sourceShoppingSettingId`를 보고, 테이블의 쇼핑몰정보설정 컬럼은 `settingSnapshot.nickname`을 본다**(`domain-design.md`, 2026-08-27 변경). 둘을 어긋나게 두면 "B설정으로 필터했는데 별칭이 B인 행이 안 나온다"가 된다.

### 불변 필드 방어

`mallCode`·`mallAccountId`·`mallId`는 기존 연동 데이터의 값을 유지한다. 고른 설정의 계정이 기존 건과 다르면 **그 건은 적용하지 않고 실패로 센다.** UI에서 이미 좁히지만, `updateMockMallLinkedProduct`와 같은 최종 방어선을 서버에도 둔다.

### 감수하는 것

- **부분 수정이 안 된다.** "출고지만 바꾸고 별칭은 유지"는 불가능하고 통째 교체만 된다. 일괄로 부분 수정하려면 개별 수정 화면(`/[id]`)에서 1건씩 해야 한다.
- 해당 계정에 활성 설정이 없으면 아무것도 할 수 없다.

---

## 4. API

### 단일 엔드포인트

```
PATCH /api/shopping/linked-products/bulk
```

두 화면이 하는 일은 서버 관점에서 "선택한 연동 건들의 스냅샷을 갱신하고 `updatedAt`을 올린다" 하나다. 나누면 스냅샷 병합·시각 갱신·소유권 검사 로직이 두 벌이 된다.

```ts
export interface BulkUpdateMallLinkedProductsBody {
  ownerId: string;
  ids: string[];
  updatedByEmail: string;
  productSnapshot?: Partial<Product>; // 상품정보수정 — 보낸 키만 얕은 병합
  /**
   * 상품정보수정 — 값을 비우기로 체크된 키.
   * JSON.stringify가 undefined 값을 가진 키를 통째로 지우기 때문에 productSnapshot에 실을 수 없다.
   */
  clearKeys?: (keyof Product)[];
  shoppingSettingId?: string;         // 쇼핑몰정보수정
}

/** Create/Resend 결과와 구조가 같지만 의미가 다르고 독립적으로 변할 수 있어 합치지 않는다. */
export interface BulkUpdateMallLinkedProductsResult {
  totalCount: number;
  successCount: number;
  failCount: number;
}
```

### 서버 동작

1. `productSnapshot`·`clearKeys`·`shoppingSettingId`가 **셋 다 없으면 400**.
2. `ids`의 각 건에 대해 소유권을 검사한다(`isOwnerMatch`). 불일치면 실패로 세고 건너뛴다.
3. `productSnapshot`이 있으면 기존 스냅샷에 **얕은 병합**: `{ ...linked.productSnapshot, ...structuredClone(patch) }`. 보낸 키만 덮이고 나머지는 유지된다.
3-1. `clearKeys`가 있으면 병합 결과에서 그 키들을 **삭제**한다. 단 `REQUIRED_BULK_EDIT_GROUPS`에 속한 그룹의 키는 무시한다 — 클라이언트가 이미 막지만, 필수 필드가 사라지면 목록이 깨지므로 서버에도 방어선을 둔다.
4. `shoppingSettingId`가 있으면 오리지널 설정을 읽어 `structuredClone`으로 `settingSnapshot`을 **통째 교체**하고, `sourceShoppingSettingId`를 갱신한다. 설정을 못 찾거나, 그 설정의 `mallCode`·`mallAccountId`·`mallId`가 기존 건과 다르면 **그 건은 실패로 세고 건너뛴다.**
5. `updatedAt`·`updatedByEmail`만 갱신한다. **`status`·`lastSentAt`·`externalProductId`는 건드리지 않는다.**
6. `{ totalCount, successCount, failCount }`를 반환한다.

`structuredClone`을 쓰는 이유는 얕은 복사면 중첩 객체가 요청 본문(또는 오리지널 설정)과 공유되어 스냅샷 독립성이 깨지기 때문이다.

### 클라이언트 훅

`useBulkUpdateMallLinkedProducts`는 기존 `useUpdateMallLinkedProduct`와 같은 형태를 따른다.

- `ownerId`는 `workspaceOwnerIdAtom`, `updatedByEmail`은 `emailAtom`에서 읽어 호출부가 넘기지 않는다.
- `onSuccess`에서 `MALL_LINKED_PRODUCTS_QUERY_KEY`와 `MALL_LINKED_PRODUCT_QUERY_KEY`를 함께 무효화한다(개별 상세 캐시도 오래된 스냅샷을 들고 있게 되므로).

### MSW

`src/mocks/handlers/mallLinkedProducts.ts`에 추가한다. **`http.patch('.../linked-products/:id')` 핸들러보다 먼저 등록한다** — `msw-rules.md`의 고정/동적 경로 충돌 규칙.

비즈니스 로직은 `src/mocks/utils/bulkUpdateMallLinkedProducts.ts`로 분리한다. 핸들러는 위임만 한다.

`route.ts`는 만들지 않는다.

---

## 5. 수정 완료 후

성공 alert(`'N건이 수정되었습니다.'`, 일부 실패 시 `'총 N건 중 M건 수정, K건 실패했습니다.'`) 후 목록으로 복귀하고 **선택을 유지한다.**

'선택 재전송'을 별도 버튼으로 분리했으므로, 수정 직후 곧바로 재전송할 수 있어야 한다. 이 프로젝트는 그동안 "처리가 끝나면 선택을 비운다"를 지켜왔으나(재전송 후, 페이지 이동 시), 여기서는 의도적으로 예외를 둔다.

---

## 6. 파일 목록

### 신규

```
src/app/(authenticated)/shopping/linked-products/bulk-edit/product/page.tsx

src/features/mallLinkedProduct/
├── api/bulkUpdateMallLinkedProducts.ts
├── api/useBulkUpdateMallLinkedProducts.ts
├── constant/productBulkEdit.constants.ts        # PRODUCT_BULK_EDIT_GROUPS
├── util/buildProductBulkPatch.ts
├── util/buildProductBulkPatch.test.ts
├── ui/MallLinkedProductActionSection.tsx
├── ui/components/ShoppingSettingApplyModal.tsx
└── ui/bulkEdit/product/
    ├── ProductBulkEditLayout.tsx
    ├── BulkEditFieldWrapper.tsx                 # 체크박스 + 라벨 + disabled 제어 (필드 단위)
    ├── BulkEditSectionWrapper.tsx               # 체크박스 카드 헤더 (섹션 단위 — 옵션·정보고시)
    └── sections/  (6개 — 옵션·정보고시는 기존 컴포넌트 재사용)

src/mocks/utils/bulkUpdateMallLinkedProducts.ts
src/mocks/utils/bulkUpdateMallLinkedProducts.test.ts
```

### 수정

```
src/features/mallLinkedProduct/ui/MallLinkedProductLayout.tsx        # ActionSection 삽입
src/features/mallLinkedProduct/ui/MallLinkedProductTableSection.tsx  # 재전송 로직 제거
src/features/mallLinkedProduct/store/selection.store.ts              # isSettingApplyModalOpenAtom 추가
src/features/mallLinkedProduct/types/mallLinkedProduct.types.ts      # 아래 타입 추가
src/mocks/handlers/mallLinkedProducts.ts                             # bulk 핸들러 (:id보다 먼저)
```

### 타입 배치

| 타입 | 위치 | 근거 |
|------|------|------|
| `BulkUpdateMallLinkedProductsBody` / `BulkUpdateMallLinkedProductsResult` | `types/mallLinkedProduct.types.ts` | 엔드포인트가 `/api/shopping/linked-products/bulk`이므로 이 도메인 (`domain-design.md`) |
| `ProductBulkEditGroupKey` / `PRODUCT_BULK_EDIT_GROUPS` | `constant/productBulkEdit.constants.ts` | 그룹 상수에서 타입이 파생되므로 같은 파일에 둔다 |

---

## 7. 테스트

Vitest. 순수 함수만 대상으로 한다(프로젝트 관례 — UI 컴포넌트와 fetch 래퍼는 테스트하지 않는다).

### `buildProductBulkPatch`

- 체크된 그룹의 키만 patch에 포함된다
- 미체크 그룹의 키는 **키 자체가 없다**(값이 `undefined`인 것과 구분된다)
- 그룹이 여러 키를 커버하면(`delivery`, `originCountry`, `option`) 체크 하나로 전부 포함된다
- 체크했고 값이 빈 문자열이면 빈 문자열이 그대로 담긴다
- 아무것도 체크하지 않으면 빈 객체를 반환한다

### `collectCheckedFieldNames`

- 체크된 그룹이 커버하는 `Product` 키를 평탄화해 돌려준다
- 미체크 그룹의 키는 포함되지 않는다 — 정보고시를 체크하지 않으면 그 `required` 검증이 돌지 않아야 한다
- 아무것도 체크하지 않으면 빈 배열을 반환한다

### `bulkUpdateMallLinkedProducts`

- `productSnapshot` 부분 병합 — 보낸 키만 덮이고 나머지 키는 유지된다
- `shoppingSettingId` 적용 — `settingSnapshot`이 오리지널 설정 값으로 교체되고 `sourceShoppingSettingId`가 갱신된다
- 고른 설정의 `mallAccountId`가 기존 건과 다르면 그 건은 변경되지 않고 `failCount`에 잡힌다
- `status`·`lastSentAt`·`externalProductId`가 변하지 않는다
- `updatedAt`·`updatedByEmail`이 갱신된다
- 타인 소유(`ownerId` 불일치) 건은 변경되지 않고 `failCount`에 잡힌다
- 깊은 복사 — 반환된 스냅샷의 중첩 객체를 변경해도 요청 본문/오리지널 설정이 영향받지 않는다
- `productSnapshot`과 `shoppingSettingId`가 둘 다 없으면 오류로 처리된다

---

## 8. 다음 라운드로 넘기는 오픈 이슈

- **'쇼핑몰정보수정'의 부분 수정** — 현재 설계는 설정 통째 교체만 지원한다. "출고지만 일괄 변경" 같은 요구가 실제로 생기면 그때 다룬다. *(Claude 추정 — 미확인. 사용자가 요청한 적 없음)*
- **버튼 명칭** — 동작이 "설정을 골라 적용"인데 이름은 '쇼핑몰정보수정'이다. 2026-08-27 사용자가 이 이름으로 확정했다. *(사용자 확정 — 원문: "쇼핑몰정보수정")*
