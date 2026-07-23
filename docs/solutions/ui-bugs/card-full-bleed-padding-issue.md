---
title: Card 컴포넌트 풀블리드 레이아웃에서 기본 패딩 이슈
date: 2026-06-02
category: ui-bugs
module: components/ui/card
problem_type: bug
component: frontend_ui
severity: medium
applies_when:
  - Card 내부 콘텐츠가 카드 가장자리까지 꽉 채워야 하는 풀블리드(full-bleed) 레이아웃을 만들 때
  - 로그인 페이지처럼 카드 안에 이미지·배너 영역이 카드 테두리까지 붙어야 할 때
  - Card 안에 grid/flex 레이아웃으로 배경색이 다른 두 영역을 나란히 배치할 때
tags:
  - card
  - full-bleed
  - padding
  - login
  - layout
---

# Card 컴포넌트 풀블리드 레이아웃에서 기본 패딩 이슈

## Context

로그인 페이지 구현 중 Card 우측에 다크 배너(`bg-zinc-900`)를 배치했는데, 배너 위아래에 흰색 여백이 노출되는 현상이 발생했다. 배너 div의 높이나 포지셔닝 문제로 보여 여러 방법을 시도했지만 해결되지 않았다. 원인은 배너가 아니라 `Card` 컴포넌트 자체의 기본 스타일이었다.

## 원인

`src/components/ui/card.tsx`의 `Card` 컴포넌트 기본 className:

```
bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm
```

**`py-6`** — 카드 상하에 24px 패딩이 기본으로 적용된다. 콘텐츠가 카드 내부 어디에 있든 위아래 24px는 `bg-card`(흰색) 배경이 노출된다.

**`gap-6`** — `flex flex-col` 컨테이너에 gap이 적용되어 자식 요소 사이에 24px 간격이 생긴다. 풀블리드 레이아웃에서는 이 간격도 흰색으로 노출될 수 있다.

## 해결

풀블리드가 필요한 Card에 `py-0 gap-0`을 추가해 기본값을 오버라이드한다.

```tsx
// ❌ 문제 — 기본 py-6가 위아래 흰 여백 생성
<Card className="overflow-hidden">
  <CardContent className="grid p-0 md:grid-cols-2">
    <LeftContent />
    <DarkBanner />   {/* 위아래에 흰색 여백 노출 */}
  </CardContent>
</Card>

// ✅ 해결 — py-0 gap-0으로 기본 패딩 제거
<Card className="overflow-hidden py-0 gap-0">
  <CardContent className="grid p-0 md:grid-cols-2">
    <LeftContent />
    <DarkBanner />   {/* 카드 테두리까지 꽉 채움 */}
  </CardContent>
</Card>
```

## 사이드 배너 높이 채우기 패턴

그리드 셀을 배경색으로 완전히 채워야 하는 사이드 배너는 `md:flex` 대신 `md:block` + `absolute inset-0` 패턴을 사용한다. flex 레이아웃은 그리드 셀 높이를 안정적으로 채우지 못할 수 있다.

```tsx
// ❌ 불안정 — flex가 그리드 셀을 완전히 채우지 못할 수 있음
<div className="relative hidden bg-zinc-900 md:flex md:flex-col md:items-center md:justify-center">
  {/* 콘텐츠 */}
</div>

// ✅ 안정적 — block이 그리드 셀을 stretch로 채우고, 내부 콘텐츠는 absolute로 중앙 배치
<div className="relative hidden bg-zinc-900 md:block">
  <div className="absolute inset-0 flex flex-col items-center justify-center">
    {/* 콘텐츠 */}
  </div>
</div>
```

## 실제 코드 위치

- `src/components/ui/card.tsx` — `Card` 컴포넌트 기본 스타일 (`py-6 gap-6` 확인)
- `src/features/auth/ui/login/LoginContainer.tsx` — `py-0 gap-0` 오버라이드 적용
- `src/features/auth/ui/login/LoginSideBanner.tsx` — `md:block` + `absolute inset-0` 패턴 적용
