# 상품 옵션 타입의 id 필드 정리

작성일: 2026-08-22
범위: `src/features/products` 옵션 타입 3종과 그 소비처

## 배경

사용자 판단: **"옵션은 복잡한 구성이므로 옵션 관련 타입의 필드는 적을수록 좋다."**
2026-08-21 새벽 `OptionCombination.combination` 제거(PR #52, `97ef22b`)가 이 원칙의 첫 적용이었고,
그 세션이 결론 없이 끊기면서 남은 논의를 이어받는다.

`OptionCombination`은 **배열의 원소 타입**이라 필드 하나의 비용이 다르다.
`Product`에 필드를 더하면 상품당 1개지만, `OptionCombination`에 더하면
조합 수만큼 곱해지고(색상3 × 사이즈4 = 12) 그것이 다시 `MallLinkedProduct.productSnapshot`으로
깊은 복사돼 연동 건마다 사본이 생긴다.

## 결정 1 — id는 "사용자가 개별 행을 직접 조작하는 대상"에만 둔다

저장되거나 파생되는 값에는 두지 않는다. 이 기준으로 옵션 타입 3종이 갈린다.

| 타입 | 성격 | id | 근거 |
|------|------|----|------|
| `ProductOptionDraft` | 화면에서 사용자가 고치고 지우는 입력 행 | **유지** | React key, 옵션명·옵션값 변경 대상 지목, 삭제 대상 지목 |
| `ProductOption` | 검증을 통과한 값 | **제거** | `toOptionDrafts`가 draft.id로 옮겨 담는 것뿐. `validateOptions`·`optionCombinations` 모두 안 읽음 |
| `OptionCombination` | 폼에 저장되는 값 | **제거** | 읽는 코드가 한 줄도 없음. 확정할 때마다 새로 발급돼 같은 조합을 계속 가리키지도 못함 |

`ProductOption.id`는 **왕복 중에만 존재하는 값**이었다 — draft.id → ProductOption.id → 다시 draft.id.
저장되지 않으므로 `deriveOptionsFromCombinations`는 이미 `generatorOptionId()`로 새로 발급하고 있었다.
제거하면 발급 지점이 draft가 태어나는 자리(`toOptionDrafts`) 한 곳으로 모인다.

**결과: 옵션 관련 필드 11개 → 9개.** `OptionCombination`은 `values`·`quantity`·`skuCode`·`optionPrice`
4개만 남고, 전부 사용자가 입력하거나 외부몰로 나가는 값이다.

부수 효과로 `useFieldArray`의 `keyName: '_id'` 오버라이드가 불필요해진다.
RHF 기본 keyName이 `id`인데 우리 `id`와 충돌해서 넣었던 것이다.

## 결정 2 — `skuCode`는 선택값이고 중복 판정은 사용자 책임이다

> "skuCode는 사용자가 관리를 하는 사용자가 있는 반면 관리를 하지 않는 사용자가 존재함.
> 그러므로 필수값으로 둘수 없어 선택적으로 처리한거임. 또한 중복검증은 프로그램에서 진행하지 않고
> 사용자가 직접 하는것이므로 별도의 중복검증이 필요없음." (2026-08-21)

`domain-design.md`의 "입력 단계의 필수 여부는 몰들 중 가장 엄격한 쪽을 따른다"가 **적용되지 않는 필드**다.
몰 요구가 아니라 사용자 관리 영역이기 때문이다. 코드만 보면 "검증이 빠졌다"로 오독하기 쉽다.

따라서 아래는 **기각**한다.
- SKU 필수 + 유니크 검증 추가
- 조합 간 SKU 중복 검증 추가

## 결정 3 — SKU 일괄생성은 이번에 손대지 않는다

현행 `SKU-${index+1}` (`ProductOptionConfirmTable.tsx:68`)을 그대로 둔다.

검토 과정에서 나온 판단만 남긴다.

- **전역 충돌은 문제가 아니다.** 중복 판정이 사용자 책임이므로 유니크성은 요구사항이 아니다.
- **uuid 기반 생성은 기각.** `skuCode`는 사람이 읽는 재고 코드다. `sku_a3f9c2b1`은 `SKU-001`보다
  정보가 더 없어 목적에 역행한다. uuid가 적합한 것은 프로그램이 읽는 id(`generatorOptionId`)이고,
  이 둘은 성격이 다르다.
- **상품코드 접두사(`smp000001-001`)는 성립하지 않는다.** `productId`는 서버가 발급하므로
  (`mocks/utils/createProduct.ts`) 등록 화면 폼에 없다. 수정 화면에서만 되면 두 화면이 서로 다른 SKU를 만든다.
- 남는 개선 여지는 **가독성**뿐이다 — 조합값 기반(`블랙-S`)이면 `formatCombinationLabel`과 같은 소스를 쓰므로
  두 화면 모두에서 성립한다.

## 변경 범위

| 파일 | 변경 |
|------|------|
| `types/product.types.ts` | `ProductOption.id`·`OptionCombination.id` 제거 |
| `util/Options.ts` | `optionCombinations` id 생성 제거, `deriveOptionsFromCombinations` id 발급 제거, `toOptionDrafts`가 id 발급 |
| `ui/components/options/ProductOptionCard.tsx` | draft → `ProductOption` 변환에서 id 제거 |
| `ui/components/options/ProductOptionConfirmTable.tsx` | `keyName` 오버라이드 제거, `key={field.id}`, 재조립 3곳에서 id 제거 |
| `util/Options.test.ts` | id 관련 테스트 정리, 필드 구성 고정 테스트 추가 |
| `mocks/data/MockProductsData.ts` | 조합 4건의 `id` 제거 |

## 후속 항목

출처를 구분해 적는다 (CLAUDE.md "미착수·후속 항목은 출처를 함께 적는다").

1. **엑셀 템플릿에 SKU 컬럼 추가** — *사용자 요구 (2026-08-21)*
   > "4번의 경우도 아직 추가를 하지 못한 부분이고 당연히 추가가 필요한 부분임."

   현재 `bulkTemplate.constant.ts`에 `옵션1`·`옵션2`·`추가옵션`만 있고 SKU가 없다.

2. **엑셀 옵션 컬럼이 매핑되지 않는다** — *Claude 관찰 (의도 여부 미확인)*
   템플릿에 옵션 컬럼이 정의돼 있으나 `productExcelSaveStrategy`가 세 컬럼을 매핑하지 않고 버린다.
   1번과 같은 라운드에서 함께 다루는 것이 자연스럽다.

3. **`skuCode`를 재고 매핑 키로 활용** — *사용자 요구 (2026-08-21, 시점 미정)*
   > "추후 옵션의 재고의 경우 skuCode를 매핑의 키로 활용을 할 생각임."

   재고관리 기능을 추가할 때 착수한다. **연동 대상 판정과는 무관하다** —
   외부몰 연동은 값의 유무로 대상을 제외하지 않으며, 판정은 외부몰 응답이 한다 (2026-08-22 확인).
   `skuCode`가 가변값이라 "확정 후 잠글 것인가"가 그때 첫 질문이 될 것이다 *(Claude 추정)*.

4. **SKU 일괄생성 가독성 개선** — *사용자 보류 (2026-08-22, "일단 남기고")*
