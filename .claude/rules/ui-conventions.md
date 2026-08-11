# UI 디자인 컨벤션

새 화면·컴포넌트를 구현할 때 아래 패턴을 기본으로 적용한다.

## Card 컴포넌트

```tsx
<Card className="overflow-hidden">
  <CardHeader className="border-b border-border/50 px-6 py-4">
    <div className="flex items-center gap-2.5">
      <div className="h-4 w-[3px] rounded-full bg-primary" />
      <CardTitle className="text-sm">섹션 제목</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="pt-6">
    {/* 폼·콘텐츠 */}
  </CardContent>
</Card>
```

- 우측에 카운트·설명이 필요하면 `CardHeader` 내부를 `flex items-center justify-between`으로 래핑하고 `CardDescription`을 우측에 배치한다.
- 헤더에 버튼이 필요하면(옵션 카드 등) accent 바 + 제목 블록을 좌측, 버튼 그룹을 우측에 배치한다.
- 검색 필터 섹션처럼 행 단위 레이아웃이 필요하면 `CardContent className="p-0"`으로 설정하고, 각 필터 행을 `<div className="px-6 py-1">` 으로 감싼다.

## 테이블

```tsx
{/* 컨테이너 */}
<div className="overflow-hidden rounded-xl border border-border/60">
  <Table>
    {/* 헤더 */}
    <TableHeader>
      <TableRow className="h-16 border-b border-border/40 bg-muted/60 hover:bg-muted/30">
        <TableHead className="w-12">{/* 체크박스 */}</TableHead>
        <TableHead className="text-center font-bold uppercase tracking-widest">컬럼명</TableHead>
      </TableRow>
    </TableHeader>
    {/* 바디 */}
    <TableBody>
      <TableRow className="group h-14 border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30">
        <TableCell className="text-center">{/* 데이터 */}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

- **상품명·주문상품명처럼 긴 텍스트 컬럼은 좌측 정렬**, 나머지는 `text-center` 기본.
- Card 내부 테이블(목록 페이지)은 별도 컨테이너 없이 Card의 `overflow-hidden`을 활용한다.

## 미구현 기능 처리 방침

메뉴·버튼은 있지만 실제 화면/기능이 아직 구현되지 않은 경우, **클릭 시 alert로 막는 방식을 쓰지 않는다.** 대신 해당 메뉴·버튼 항목 자체를 사이드바/화면에서 삭제한다. 실제 구현이 완료되면 그때 다시 추가한다.

- **Why:** alert 차단 코드는 "나중에 제거해야 한다"는 부채를 만들고, 클릭해도 아무것도 안 되는 버튼이 보이는 것 자체가 어색한 UX다. 없는 기능은 아예 안 보이는 게 자연스럽다.
- (2026-06-25 alert 차단 방식을 전면 폐기하고 이 방침으로 전환 완료)

## 필터·쇼핑몰 공용 상수 (도메인별 재정의 금지)

필터 Select와 쇼핑몰 표시는 아래 세 가지를 **반드시 공용 모듈에서 import**한다. 도메인 상수 파일이나 컴포넌트 파일 안에 같은 값을 다시 만들지 않는다.

| 용도 | import 대상 |
|------|------------|
| 필터 '전체' 옵션 | `ALL_FILTER_OPTION` — `@/shared/constant/filter.constant` |
| 쇼핑몰 목록을 `FilterOption[]`으로 | `SHOPPING_MALL_OPTIONS` — `@/shared/constant/shoppingMall.constant` |
| mallCode → 쇼핑몰 한글명 | `getShoppingMallName(code)` — `@/utils/shoppingMallGenerator` |

- **Why:** 셋 다 공용 구현이 있는데도 도메인마다 다른 이름으로 재정의되어 있었다. 2026-08-06 정리 시점에 `{ id: 'ALL', name: '전체' }`가 8개 이름(`ALL_USER_GRADE`, `ALL_ACCOUNT_STATUS`, `ALL_MALL_NAME`, `ALL_SETTING_MALL_NAME`, `ALL_MALL_ACCOUNT`, `ALL_PRODUCT_STATUS_OPTION`, `ALL_ORDER_STATUS`, 로컬 `ALL_OPTION` 2곳)으로, `SHOPPING_MALLS.map(...)` 파생이 5곳, 로컬 `getMallName` 정의가 **10곳**에 있었다. 전부 제거하고 위 3개로 통일했다.
- 새 필터를 만들 때 "이 도메인 전용 '전체' 옵션"이 필요해 보이면 대부분 착각이다. `id: 'ALL'`은 검색 필터 타입들이 `T | 'ALL'` 형태로 이미 전제하고 있는 값이다.
- `SHOPPING_MALLS`(원본 배열) 직접 참조는 **다른 형태로 파생할 때만** 허용한다 (예: `ShoppingAccountForm`의 코드 목록 `MALL_CODES`, mock 데이터 생성). 이름 조회·필터 옵션 목적이면 위 표를 쓴다.

## 날짜 범위 필터

목록 화면의 "검색 일자" 행은 **`RangeDateFilter`**(`@/components/common/RangeDateFilter`)를 쓴다. `RangeDatePicker`·`DatePickerRangeButton`을 직접 조립하지 않는다.

```tsx
export const XxxDateFilter = () => {
  const [dateType, setDateType] = useAtom(xxxDateTypeAtom);
  const setStartDate = useSetAtom(xxxStartDateAtom);
  const setEndDate = useSetAtom(xxxEndDateAtom);

  const handleChangeDate = useCallback(
    (startDate: string, endDate: string) => {
      setStartDate(startDate);
      setEndDate(endDate);
    },
    [setStartDate, setEndDate],
  );

  return (
    <RangeDateFilter
      onChangeDate={handleChangeDate}
      dateType={{ value: dateType, options: XXX_DATE_TYPE, onChange: setDateType }}
    />
  );
};
```

- `dateType`은 **선택적**이다. 기준일이 하나뿐인 화면(주문수집 등)은 생략하고 `label`만 바꾼다.
- `dateType`을 값·옵션·핸들러 개별 prop으로 흩지 않고 한 객체로 묶은 이유는 셋이 항상 함께 필요하기 때문이다. 일부만 넘기는 잘못된 조합을 타입 레벨에서 막는다.
- **Why:** 이 배선(`pickerInitDate`·`resetKey`·`handleChangeDateRange`)이 7개 화면에 통째로 복사돼 있었다. 특히 "기간 버튼을 누르면 `resetKey`를 올려 `RangeDatePicker` 내부 state를 재동기화한다"는 비자명한 트릭이 7벌 복제돼, 여기 버그가 생기면 7곳을 고쳐야 했다. 2026-08-06 공용화 완료.

## 목록 화면 검색 필터 store 네이밍

검색 필터를 draft/committed 두 단계로 두는 목록 화면은 아래 이름을 쓴다. **복수형이 표준이다.**

| 역할 | 이름 |
|------|------|
| UI 조작 중인 draft (검색 버튼 전) | `get<Domain>SearchFilterAtom` |
| 검색 버튼으로 확정된 값 (쿼리에 사용) | `committedFiltersAtom` |

`draftFilterAtom` / `committedFilterAtom`(단수) 쪽이 대칭은 더 낫지만, 5개 도메인(account·order·shoppingAccount·shoppingSetting·mallLinkedProduct) 중 4개가 이미 위 형태였고 2026-08-06에 나머지 하나를 맞춰 통일했다. 새 목록 화면은 위 표를 따른다.

## 검색 필터는 화면이 소유한다 (다른 도메인 것을 가져다 쓰지 않는다)

라우트가 다르면 화면도 다르다. **검색 필터 컴포넌트와 그 store는 화면마다 자기 것을 갖는다.** 목록 구성이 비슷해 보여도 다른 도메인의 필터 섹션을 import하지 않는다.

- 조립 재료(`RangeDateFilter`, `FilterSelect`, `Select`)는 공용을 쓴다. 화면이 소유하는 건 **atom에 바인딩된 얇은 래퍼와 그 store**다.
- 반대로 **요청 타입·조회 API·표시용 상수는 공유한다.** 두 화면이 같은 엔드포인트를 부르면 요청 타입은 하나여야 한다([`domain-design.md`](domain-design.md) 참고). 분리하는 것은 UI와 store뿐이다.
- **Why:** `/shopping/register`가 `/products/list`의 `ProductSearchFilterSection`을 가져다 썼다. 그 하위 컴포넌트가 전부 products의 전역 atom에 직접 바인딩돼 있어 **컴포넌트를 가져오면 store까지 딸려왔고**, 상품목록에서 필터를 걸고 등록 화면으로 이동하면 필터가 따라오는 버그가 됐다.
- **격리 기법을 찾기 전에 왜 공유하는지부터 본다.** 위 버그를 스코프 Jotai Provider로 막으려다 그 방식이 auth atom을 끊어 화면 전체를 죽인다는 것만 확인하고 한 라운드를 흘려보냈다(2026-08-06). 원인은 소유권이었고, 화면별 store·컴포넌트로 분리하니 증상이 함께 사라졌다(2026-08-11).
- 같은 결론이 테이블 헤더 상수에서 먼저 나왔다 — [`docs/solutions/architecture-patterns/screen-owned-table-header-constants.md`](../../docs/solutions/architecture-patterns/screen-owned-table-header-constants.md), [`scoped-jotai-provider-breaks-auth-atoms.md`](../../docs/solutions/architecture-patterns/scoped-jotai-provider-breaks-auth-atoms.md).

## 검색 필터 섹션 (주문·상품·사용자 목록 페이지 공통)

```tsx
<Card className="overflow-hidden">
  <CardHeader className="border-b border-border/50 px-6 py-4">
    <div className="flex items-center gap-2.5">
      <div className="h-4 w-[3px] rounded-full bg-primary" />
      <CardTitle className="text-sm">검색 및 필터</CardTitle>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <div className="space-y-1">
      <div className="px-6 py-1"><FilterRow1 /></div>
      <div className="px-6 py-1"><FilterRow2 /></div>
      {/* 검색어 행에 검색 버튼 인라인 배치 */}
      <div className="px-6 py-1"><SearchInputWithButton /></div>
    </div>
  </CardContent>
</Card>
```
