---
title: 로컬 state와 폼이 진실 소스를 나눠 가지면 늦게 도착한 데이터가 화면에 안 뜬다 — 옵션 카드 시딩
date: 2026-08-21
category: architecture-patterns
module: products
problem_type: state_sync
component: form
severity: high
applies_when:
  - 자식 컴포넌트가 로컬 state로 편집하고 확정 시점에만 `setValue`로 폼에 반영할 때
  - 수정 화면이 `useQuery` 응답을 `reset()`으로 폼에 채울 때
  - 등록 화면에서 만든 컴포넌트를 수정 화면에서 그대로 재사용할 때
symptoms:
  - 수정 화면에서 폼 값에는 데이터가 있는데 해당 UI만 비어 있다
  - `queryData`를 콘솔로 찍으면 값이 정상인데 자식 컴포넌트의 state는 `[]`이다
  - 등록 화면에서는 같은 컴포넌트가 정상 동작한다
  - 화면에 안 보이는 값이 저장 시 조용히 사라진다
tags:
  - react-hook-form
  - state-sync
  - source-of-truth
  - seeding
  - remount-key
---

# 로컬 state와 폼이 진실 소스를 나눠 가지면 늦게 도착한 데이터가 화면에 안 뜬다

## 문제

상품 옵션 UI(`ProductOptionCard`)는 옵션명·옵션값을 **로컬 state**로 편집하고, `확정` 버튼을 눌렀을 때만 `setValue('option', combinations)`로 폼에 넘긴다. 등록 화면(`/products/create`)에서는 완벽하게 동작한다.

그런데 수정 화면(`/products/[id]`, `/shopping/linked-products/[id]`)에서는 **옵션이 있는 상품을 열어도 옵션 카드가 비어 있었다.**

```tsx
// ProductModifyLayout — 데이터가 도착하면 폼에 채운다
useEffect(() => {
  if (isSuccess && queryData) {
    formData.reset(queryData);   // queryData.option 에 조합 4건이 들어 있다
  }
}, [isSuccess, queryData]);
```

`queryData`를 찍어보면 옵션이 정상적으로 들어 있고 `reset()`도 실행된다. 그런데 카드의 `options` state는 `[]`이다.

## 왜 그런가 — 동기화가 단방향이다

`ProductOptionCard`는 `useFormContext`를 **아예 import하지 않는다.** 폼을 읽을 수단이 없다.

```tsx
const [options, setOptions] = useState<ProductOptionDraft[]>([]);
```

이 state에 쓰는 코드는 `handleAddOption` / `handleOptionNameChange` / `handleOptionValueChange` / `handleRemoveOption` 4개뿐이고 전부 사용자 입력이다. `reset()`이 채우는 건 RHF 내부 store이고, 그 값을 로컬 state로 되읽는 경로가 없다.

**로컬 state → 폼**은 이어져 있는데 **폼 → 로컬 state**가 없다. 등록 화면은 폼이 처음부터 비어 있어 이 방향이 필요 없었고, 그래서 결함이 드러나지 않았다.

시딩이 필요한 state는 옵션 카드당 3개 + 섹션 2개, 기본/추가 합쳐 **8개**였다.

| 위치 | state | 안 채워지면 |
|------|-------|------------|
| `ProductOptionCard` | `isOptionsConfirmed` | 확정 전 편집 뷰가 뜸 |
| `ProductOptionCard` | `options` | 입력창 0줄 → "옵션을 추가하세요." |
| `ProductOptionCard` | `confirmedOptions` | 확정 뷰의 `색상(2개)` 요약이 빔 |
| `ProductOptionSection` | `isConfirmed`, `combinations` | 조합 테이블이 통째로 렌더 안 됨 |

## 세 타입의 관계 — 무엇을 되묶는 것인가

옵션은 세 타입을 거친다. 이름이 비슷해 헷갈리지만 **담는 정보의 결이 다르다.**

| 타입 | 한 원소가 뜻하는 것 | 개수 (색상2 × 사이즈2일 때) |
|------|--------------------|--------------------------|
| `ProductOptionDraft` | 입력창 한 줄 = 옵션 **축** | 2 |
| `ProductOption` | 검증 통과한 옵션 **축** | 2 |
| `OptionCombination` | 곱해진 **결과 행** | 4 |

```ts
// 1. ProductOptionDraft[] — 입력창 상태. values가 comma-separated 문자열
[
  { id: 'opt_a1b2c3d4', name: '색상', values: '블랙, 화이트' },
  { id: 'opt_e5f6a7b8', name: '사이즈', values: 'S, L' },
]

// 2. ProductOption[] — validateOptions 통과. values가 배열로 쪼개짐
[
  { id: 'opt_a1b2c3d4', name: '색상', values: ['블랙', '화이트'] },
  { id: 'opt_e5f6a7b8', name: '사이즈', values: ['S', 'L'] },
]

// 3. OptionCombination[] — optionCombinations()가 곱한 결과. 폼에 저장되는 건 이것뿐
[
  { id: 'option_2_...', values: { 색상: '블랙', 사이즈: 'S' }, quantity: 30, skuCode: 'SMP1-BLK-S', optionPrice: 0 },
  { id: 'option_2_...', values: { 색상: '블랙', 사이즈: 'L' }, quantity: 25, skuCode: 'SMP1-BLK-L', optionPrice: 1000 },
  { id: 'option_2_...', values: { 색상: '화이트', 사이즈: 'S' }, quantity: 25, skuCode: 'SMP1-WHT-S', optionPrice: 0 },
  { id: 'option_2_...', values: { 색상: '화이트', 사이즈: 'L' }, quantity: 20, skuCode: 'SMP1-WHT-L', optionPrice: 1000 },
]
```

```
            ProductOptionDraft[]  ─── split(',') + validateOptions ──▶  ProductOption[]
                    ▲                                                         │
                    │                                                         │ optionCombinations()  ← 축을 곱한다
    toOptionDrafts()│                                                         ▼
                    │                                                  OptionCombination[]  (폼 = Product.option)
                    └──────── deriveOptionsFromCombinations() ◀────────────────┘
                                     ← 행을 축으로 되묶는다
```

**저장되는 건 3번뿐이다.** 그래서 수정 화면 진입 시 3 → 2 → 1로 거슬러 올라가야 카드를 채울 수 있고, 그 첫 단계(행 → 축)가 역파생이다. 필드 이름만 바꾸는 변환이 아니라 **그룹핑을 되돌리는 것**이라 `map` 하나로 끝나지 않는다.

역파생이 성립하는 근거는 `optionCombinations`가 **모든 축의 데카르트 곱 전체**를 만든다는 것이다. 덕분에 모든 축 이름이 모든 조합의 키로 등장하고, 모든 축의 값이 최소 한 번은 나타난다.


### 곁다리 — 같은 이유로 `combination` 필드를 걷어냈다

`OptionCombination`에는 원래 `combination: string`(`'색상: 블랙, 사이즈: S'`)이 있었다. `values`에서 그대로 만들어지는 **표시용 라벨**이었고, 읽는 곳은 조합 목록의 라벨 한 군데뿐이었다. 나머지 3곳은 `replace()`로 행을 재조립할 때 값을 잃지 않으려고 옮겨 담는 pass-through였다.

저장 데이터가 같은 사실을 두 형태로 갖고 있었으므로, 옵션값을 고치는 경로마다 라벨 동기화를 기억해야 했다. 그 경로는 하나가 아니다 — 화면(`ProductOptionConfirmTable`)에 더해 **엑셀 업로드도 옵션을 쓰도록 설계돼 있다**(`bulkTemplate.constant.ts`에 `옵션1`·`옵션2`·`추가옵션` 컬럼이 있고 `productExcelSaveStrategy`가 아직 매핑하지 않을 뿐이다). 작성자가 늘수록 어긋날 자리가 늘어난다.

`formatCombinationLabel(values)` 한 줄로 대체했다. 부수 효과로 `optionCombinations`의 재귀에서 문자열 누적 파라미터가 사라져 함수가 짧아졌다.

**판단 기준:** 파생 가능한 값을 저장할지 말지는 "계산 비용"이 아니라 **"쓰는 경로가 몇 개인가"**로 본다. 경로가 하나면 저장해도 어긋나지 않지만, 둘 이상이면 동기화 규칙이 암묵지가 된다. 이 문서의 본론(로컬 state와 폼이 진실 소스를 나눠 가진 결함)과 같은 병이 저장 층에서 재현되는 형태다.

## 이게 왜 위험한가 — 안 보이는 값이 조용히 삭제된다

단순히 "안 보이는" 문제가 아니다. 확정 핸들러가 **머지가 아니라 통째로 덮어쓰기**다.

```tsx
onConfirm={(combinations) => setValue('option', combinations)}   // 기존 값을 통째로 교체
```

기존 옵션 6건이 있는 상품의 수정 화면에서 옵션 하나를 추가하고 `확정`을 누르면, 사용자는 "하나 추가했다"고 생각하지만 **기존 6건은 화면에 보인 적도 없이 사라진다.** 목록 검색은 top-level 필드와 `productSnapshot`만 읽으므로 화면상 증상도 없다.

## 해결 — 폼이 처음 채워질 때 1회 시딩

### 1. 역파생 유틸

폼(`Product.option`)에는 **조합 결과만** 저장되고 옵션 정의(`ProductOption[]`)는 남지 않는다. 카드를 채우려면 조합의 `values` 맵에서 되짚어야 한다.

```ts
// src/features/products/util/Options.ts
export const deriveOptionsFromCombinations = (combinations: OptionCombination[]): ProductOption[] => {
  if (combinations.length === 0) return [];
  const optionNames = Object.keys(combinations[0].values);   // 조합 생성 순서 = 옵션 순서
  return optionNames.map((name) => ({
    id: generatorOptionId(),                                  // id는 저장되지 않으므로 새로 발급
    name,
    values: Array.from(new Set(combinations.map((c) => c.values[name]).filter(Boolean))),
  }));
};
```

`optionCombinations`와 서로 역함수 관계이므로 **라운드트립 테스트로 고정**해 둔다(`Options.test.ts`). 한쪽만 바뀌면 테스트가 깨진다.

### 2. 시딩 훅

```ts
// options/hooks/useProductOptionState.ts
const formCombinations = useWatch({ control, name });
const isSeededRef = useRef(false);

useEffect(() => {
  if (isSeededRef.current) return;
  if (!formCombinations?.length) return;
  isSeededRef.current = true;
  setInitialOptions(deriveOptionsFromCombinations(formCombinations));
  setCombinations(formCombinations);
  setIsConfirmed(true);
  setSeedKey((key) => key + 1);   // 카드 remount 트리거
}, [formCombinations]);
```

### 3. remount 키로 초기값 주입

동기화 이펙트를 카드에 넣는 대신 `key`로 remount시켜 `useState` 초기값으로 받는다. 카드는 `initialOptions`를 **초기값으로만** 읽으므로 이후 사용자 편집이 prop에 덮이지 않는다.

```tsx
<ProductOptionCard key={`basic-${basicOption.seedKey}`} initialOptions={basicOption.initialOptions} ... />
```

## 걸려 넘어지기 쉬운 지점

- **`confirm`에서도 `isSeededRef`를 세워야 한다.** 안 그러면 등록 화면에서 `확정` → `setValue` → `useWatch` 발화 → 시딩 이펙트 재실행 → 카드 remount로 편집 중이던 상태가 날아간다. 시딩 이펙트가 **자기가 만든 폼 변경에 다시 반응하는** 자기참조 구조라, 가드는 "1회 제한"이 아니라 **"사용자 조작 이후로는 폼이 진실 소스가 아니다"**를 뜻한다.
- **기본/추가 옵션은 훅 인스턴스를 따로 가진다.** `seedKey`를 공유하면 한쪽 시딩이 다른 쪽 카드까지 remount시켜, 로딩 직후 사용자가 입력 중이던 값을 날린다.
- **마운트 시점의 `replace([])`는 문제가 아니다.** `ProductOptionConfirmTable`이 마운트 이펙트에서 빈 배열로 폼을 밀지만, 자식 이펙트가 부모 이펙트보다 먼저 돌아 `reset()`이 나중에 덮는다. `MallLinkedProductEditLayout`은 `isPending` early return으로 아예 마운트되지 않는다. 여기를 의심하다 한 번 헛짚었다.
- **역파생은 완전 무손실이 아니다.** draft가 comma-separated 문자열이라 옵션값에 `,`가 들어가면 왕복이 깨진다. 입력 단계에서 `values.split(',')`로 받고 있어 새로 생긴 제약은 아니다.
- **옵션명이 순수 숫자 문자열이면 축 순서가 뒤집힌다.** 역파생은 `Object.keys(combinations[0].values)`의 순서를 축 순서로 쓰는데, JS는 정수 형태 키를 앞으로 끌어올린다.

  ```js
  Object.keys({ '2': 'a', '색상': 'b', '1': 'c' });   // → [ '1', '2', '색상' ]
  ```

  옵션명이 `"1"`, `"2"`인 경우만 해당하고 `"1단계"`처럼 숫자로 시작만 하는 건 안전하다. 실제로 그렇게 짓는 경우가 거의 없다고 보고 그대로 뒀다. 막아야 한다면 축 순서를 별도 배열로 저장하는 수밖에 없는데, 그건 아래 `combination` 필드를 걷어낸 이유와 정면으로 충돌한다 — **더 안전한 대안이 아니라 다른 취약점과 맞바꾸는 것**이라 판단했다.

## 언제 이 문서를 떠올릴 것인가

**"등록 화면에서는 되는데 수정 화면에서만 안 된다"**가 신호다. 폼 값을 찍어보면 멀쩡한데 화면만 비어 있다면, 그 컴포넌트가 폼을 읽는지부터 확인한다 — `useFormContext` import가 없으면 확정이다.

더 일반적으로는, **자식이 로컬 state로 편집하고 확정 시점에만 폼으로 흘려보내는 구조를 만들 때** 처음부터 "이 화면이 나중에 데이터를 받아 `reset()`하게 되면?"을 물어야 한다. 등록 전용으로 만든 컴포넌트를 수정 화면이 재사용하는 순간 이 결함이 생긴다.

## Related

- `.claude/rules/domain-design.md` — 오리지널 데이터와 쇼핑몰 연동 데이터(스냅샷 모델)
- [`rhf-field-validation-skipped-in-section-list-screens.md`](rhf-field-validation-skipped-in-section-list-screens.md) — 같은 폼 컴포넌트를 여러 화면이 공유할 때 한 화면만 빠져 무증상이 되는 사례
- [`client-supplied-snapshot-immutable-field-restore-scope.md`](client-supplied-snapshot-immutable-field-restore-scope.md) — 화면에 안 보이는 값이 저장 시 어긋나는 다른 경로
