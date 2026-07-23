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
