---
title: 등급별 액션 버튼 노출 패턴 (super_admin/admin/operator)
date: 2026-06-15
category: conventions
module: features/shoppingAccount
problem_type: convention
component: frontend_stimulus
severity: medium
applies_when:
  - 목록 화면의 일괄 액션(삭제, 상태변경 등)을 로그인 등급에 따라 다르게 노출해야 할 때
  - 새 도메인 목록 화면(매입처·매출처 등)에서 등급별 권한 정책을 설계할 때
tags:
  - role-based-access
  - grade
  - permission
  - convention
  - action-section
---

# 등급별 액션 버튼 노출 패턴 (super_admin/admin/operator)

## Context

쇼핑몰 계정관리(`/shopping/accounts`) 목록 화면을 만들면서, 선택 항목에 대한 일괄 액션(계정삭제/사용여부 변경)을 등급에 따라 다르게 허용해야 했다:

| 등급 | 계정삭제 | 상태변경(사용여부) |
|---|---|---|
| `super_admin` | ✅ | ✅ |
| `admin` | ❌ | ✅ |
| `operator` | ❌ | ❌ |

## Guidance

**`gradeAtom`에서 등급을 읽어 액션별 boolean을 계산하고, 그 boolean으로 버튼 렌더링과 섹션 전체 표시 여부를 함께 제어한다.**

```tsx
// src/features/shoppingAccount/ui/list/ShoppingAccountActionSection.tsx
const grade = useAtomValue(gradeAtom);

const canDelete = grade === 'super_admin';
const canChangeStatus = grade === 'super_admin' || grade === 'admin';

if (!canDelete && !canChangeStatus) return null; // operator는 액션 섹션 자체가 안 보임

return (
  <div className="flex items-center gap-3 py-1">
    {/* ... */}
    {canDelete && <Button onClick={handleDelete}>계정삭제</Button>}
    {canChangeStatus && (
      <>
        <Select /* 상태 선택 */ />
        <Button onClick={handleChangeStatus}>사용변경</Button>
      </>
    )}
  </div>
);
```

핵심 포인트:

- **액션 하나하나를 독립된 boolean으로 계산한다.** `canDelete`/`canChangeStatus`처럼 액션 단위로 이름을 붙이면, 나중에 액션이 추가되거나 등급별 정책이 바뀔 때 해당 boolean의 조건식만 수정하면 된다.
- **모든 액션이 `false`면 섹션 자체를 렌더링하지 않는다** (`if (!canDelete && !canChangeStatus) return null`). `operator`가 빈 버튼 영역을 보게 하지 않는다.
- **버튼 하나하나를 boolean으로 감싼다** (`{canDelete && <Button>...}`) — 섹션은 보이지만 특정 버튼만 숨기는 세밀한 제어가 필요할 수 있기 때문에, 섹션 레벨 조건과 버튼 레벨 조건을 분리해서 유지한다.
- **등급 이름을 하드코딩한 문자열 비교로 직접 쓴다** (`grade === 'super_admin'`). 이 프로젝트는 등급이 3개로 고정되어 있고 자주 바뀌지 않으므로, 별도의 권한 매트릭스 설정 객체 같은 추상화 없이 이 정도로 충분하다 — 등급 조합이 더 복잡해지면(4개 이상, 도메인마다 다른 매트릭스 등) 그때 추상화를 검토한다.

## Why This Matters

- 등급별 정책이 컴포넌트 하나에 명확히 드러나 있어, 새 팀원이 "누가 무엇을 할 수 있는지" 파악하기 위해 여러 파일을 뒤질 필요가 없다.
- `operator`가 아무 액션도 없을 때 빈 UI 영역이 남지 않는다 — 섹션째 사라지므로 레이아웃도 깨끗하다.
- 도메인마다 액션/등급 조합이 다를 수 있으므로(예: 매입처는 `operator`도 상태변경 가능할 수 있음), 매 도메인의 액션 섹션 컴포넌트에서 이 boolean 계산 로직을 그 도메인 정책에 맞게 다시 쓴다 — 공통 유틸로 억지로 추상화하지 않는다.

## When to Apply

- 목록 화면에 일괄 액션(삭제/상태변경/내보내기 등)을 추가하고, 그 액션을 등급별로 제한해야 할 때
- 새 도메인(매입처·매출처 등)의 액션 섹션을 설계할 때 — 이 컴포넌트를 템플릿으로 참고하되, 그 도메인 고유의 등급-액션 매트릭스를 먼저 사용자와 확정한 뒤 구현한다

## Related

- `src/features/auth/store/auth.store.ts` — `gradeAtom`
- `src/features/shoppingAccount/ui/list/ShoppingAccountActionSection.tsx` — 이 패턴의 원 구현
- `docs/solutions/architecture-patterns/user-hierarchy-ownerid-pattern.md` — `UserGrade`/`SubUserGrade` 타입 정의
- `docs/solutions/logic-errors/super-admin-grade-schema-bypass.md` — 등급 부여(등록) 쪽의 관련 정책 버그
