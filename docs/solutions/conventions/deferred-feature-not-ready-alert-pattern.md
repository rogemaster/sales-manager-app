---
title: 미설계 기능을 "준비중" alert로 스텁 처리하는 단계적 화면 구축 패턴
date: 2026-07-08
category: conventions
module: features/shoppingSetting
problem_type: convention
component: frontend_stimulus
severity: low
applies_when:
  - 화면의 일부 기능(상세 입력, 편집 모달 등)이 아직 설계되지 않았는데 리스트/목록 화면부터 먼저 구현해야 할 때
  - 여러 라운드로 나눠 기능을 확장할 계획이고, 이번 라운드에 없는 버튼을 UI에 남겨둘지 판단할 때
tags:
  - deferred-feature
  - scope-boundary
  - alert
  - phased-rollout
  - convention
---

# 미설계 기능을 "준비중" alert로 스텁 처리하는 단계적 화면 구축 패턴

## Context

"쇼핑몰 정보설정" 화면을 브레인스토밍하면서, 사용자는 리스트 화면(검색/필터/액션/테이블)만 먼저 구현하고 정보 입력 화면·수정 모달·복사·정보일괄설정 모달은 다음 작업으로 미루기로 결정했다. 문제는: 이 4개 기능에 연결된 버튼(신규추가의 "등록", 테이블의 "수정"/"복사", "정보일괄설정")은 이번 화면에 이미 노출돼야 하는데, 그 뒤에 실제로 연결할 로직/화면이 없다는 점이었다.

## Guidance

**버튼/UI는 최종 형태 그대로 배치하되, 클릭 시 공통 alert로 안내하고 실제 기능은 연결하지 않는다.**

```typescript
showAlert({ message: '준비중인 기능입니다.', type: 'info' });
```

이 프로젝트에서는 이 한 줄을 아래 3곳에 동일하게 적용했다:

- `NewSettingModal.tsx`의 "등록" 버튼 (`handleRegister`)
- `ShoppingSettingTable.tsx`의 "수정"/"복사" 버튼 (공통 `notReady` 헬퍼)
- `ShoppingSettingActionSection.tsx`의 "정보일괄설정" 버튼 — 단, **검증(동일 쇼핑몰 선택 여부)은 실제로 통과시킨 뒤** alert를 띄운다. 검증 자체는 이번 라운드에도 유효한 요구사항이기 때문이다.

```typescript
const handleBulkSetting = () => {
  if (selectedSettings.length === 0) {
    showAlert({ message: '설정할 항목을 선택해주세요.', type: 'warning' });
    return;
  }
  const selectedMallCodes = new Set(settings.filter((s) => selectedSettings.includes(s.id)).map((s) => s.mallCode));
  if (selectedMallCodes.size > 1) {
    showAlert({ message: '동일한 쇼핑몰만 선택해 주세요.', type: 'warning' });
    return;
  }
  showAlert({ message: '준비중인 기능입니다.', type: 'info' }); // 검증 통과 후에만 stub alert
};
```

### 이 프로젝트의 과거 "미구현 페이지 alert 차단" 패턴과의 차이

이 프로젝트는 과거에 미구현 **페이지 전체**를 alert로 막는 방식을 썼다가, 메뉴 자체를 삭제하는 방향으로 리팩터링한 이력이 있다(`9b2183a refactor: 미구현 페이지 alert 차단 방식 제거 및 메뉴 삭제`). 이번 패턴은 그와 다르다 — **화면 자체는 완성됐고, 그 화면 안의 일부 버튼만** 다음 라운드로 미룬 것이다. 페이지 단위로 숨기는 게 아니라 버튼 단위로 스텁 처리한다는 점이 핵심 차이다.

## Why This Matters

- 사용자(기획/QA)가 이번 라운드 결과물을 볼 때, 최종 레이아웃과 동일한 화면을 미리 확인할 수 있다 — 버튼이 아예 없으면 완성된 화면의 느낌을 판단하기 어렵다.
- 검증 로직(선택 검사, 동일 쇼핑몰 검사)은 다음 라운드에서도 그대로 재사용되므로, 미리 구현해두면 다음 라운드에서 다시 만들 필요가 없다.
- alert 문구를 하나로 통일해두면, 다음 라운드에서 실제 기능을 연결할 때 "이 문자열이 나오는 곳"으로 검색해서 빠짐없이 교체할 수 있다.

## When to Apply

- 리스트/목록 화면을 먼저 구현하고 상세 입력·편집 기능을 다음 라운드로 미루기로 사용자와 합의했을 때
- 버튼을 완전히 숨기는 대신 배치는 유지하되 동작만 비활성화하고 싶을 때
- 버튼에 딸린 검증 로직이 이미 확정된 스펙이라면, alert 이전에 검증까지는 구현한다 (검증 자체를 미루지 않는다)

## Related

- `src/features/shoppingSetting/ui/list/ShoppingSettingActionSection.tsx` — 검증 후 stub alert
- `src/features/shoppingSetting/ui/list/components/NewSettingModal.tsx`, `ShoppingSettingTable.tsx` — 단순 stub alert
- `docs/superpowers/plans/2026-07-08-shopping-mall-settings.md` — Global Constraints의 "준비중" 처리 대상 목록
