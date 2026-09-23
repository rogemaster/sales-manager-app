---
title: 권한 정책은 UI와 API가 표 하나를 함께 읽는다 — 두 곳에 적은 정책은 복잡도와 무관하게 어긋난다
date: 2026-09-23
category: architecture-patterns
module: auth, account, shoppingAccount, shoppingSetting
problem_type: architecture_pattern
component: authorization
severity: high
applies_when:
  - 등급(super_admin·admin·operator)에 따라 버튼을 숨기거나 API를 막아야 할 때
  - 새 쓰기 route를 만들거나 기존 화면에 등급별 액션을 추가할 때
  - 권한 없는 등급에게 상세 화면을 읽기 전용으로 보여줘야 할 때
symptoms:
  - 화면에서는 버튼이 숨겨졌는데 API를 직접 부르면 그대로 성공한다
  - 반대로 화면에는 버튼이 보이는데 누르면 403이 난다
  - "<fieldset disabled>"로 감싼 읽기 전용 폼에서 Radix Select가 여전히 열린다
tags:
  - authorization
  - permission
  - grade
  - radix-select
  - inert
---

# 권한 정책은 UI와 API가 표 하나를 함께 읽는다

## Context

2026-09-23 전까지 등급 정책은 화면(`grade === 'super_admin'` 같은 boolean)과 API(`requireSession` / `requireSuperAdminSession`)에 **따로** 적혀 있었다. 영역마다 서로 다른 방향으로 어긋나 있었다.

| 영역 | 화면 | API | 결과 |
|------|------|-----|------|
| 쇼핑몰계정 | 삭제 super_admin만 | 로그인만 확인 | operator가 요청 한 줄로 삭제 가능 |
| 정보설정·연동상품·상품 | 구분 없음 | 로그인만 확인 | 정책 자체가 없음 |
| 사용자관리 | admin에게 등록 버튼 노출 | super_admin 전용 | admin이 누르면 403 |

원인은 기술이 아니라 **문서 간 충돌**이었다. 사용자관리 화면 스펙(05-29·05-30)은 "admin도 등록, 승인 대기"를 정했는데, 나중에 API 가드를 붙인 스펙(07-15)이 그것을 반영하지 않고 "사용자 관리는 super_admin 전용"으로 막았다. 정책이 두 곳에 있으면 한쪽을 고치는 사람은 다른 쪽을 모른다.

## Guidance

### 1. 정책표 하나 — 서버 전용 import가 없는 순수 모듈

`src/shared/utils/permission.ts`의 `PERMISSIONS`가 정본이다. 화면은 `usePermission(permission)`, route는 `requirePermission(req, permission)`으로 같은 표를 읽는다.

```ts
export const PERMISSIONS = {
  'user.create': ['super_admin', 'admin'],
  'user.approve': ['super_admin'],
  'shoppingAccount.delete': ['super_admin', 'admin'],
  // ...
} as const satisfies Record<string, readonly UserGrade[]>;

export const can = (grade: UserGrade, permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly UserGrade[]).includes(grade);
```

- **표에 없는 동작은 로그인한 모든 등급에 허용한다.** 조회와 상품·연동상품(일상 업무)은 키를 두지 않고 `requireSession`만 쓴다. "전 등급 허용"을 키로 나열하면 표만 길어지고 강제하는 것이 없다.
- **키는 동작 단위로 쪼갠다.** 쇼핑몰계정의 create·update·changeStatus·delete는 지금 값이 모두 같지만 `shoppingAccount.write` 하나로 합치지 않는다. 같은 날 "삭제에 admin 포함"처럼 **칸 하나만 바뀌는 결정**이 실제로 나왔다. 표의 한 칸이 코드 한 줄이어야 그런 결정이 한 줄 수정으로 끝난다.
- 테스트는 정책표를 **테스트 안에 따로 한 번 더 적고** 전 칸을 비교한다(`permission.test.ts`). 같은 값을 복사해 쓰면 틀린 표를 틀린 표로 검증하게 된다.

### 2. route 가드는 DB보다 먼저 — 그 순서까지 테스트한다

`requirePermission`은 route 맨 앞, `try` 밖에서 부른다. `src/app/api/routePermissions.test.ts`는 `@/db`를 "접근하면 예외를 던지는" Proxy로 모킹하고, 권한 없는 등급으로 호출했을 때 **정확히 403과 고정 문구**가 나오는지 본다. 가드가 DB 조회 뒤에 있으면 route의 `catch`가 500을 내므로 순서 실수도 함께 걸린다. 허용 등급은 "403이 아니다"만 확인한다 — 비즈니스 로직은 이 테스트의 범위가 아니다.

한계: 새 route를 만들며 이 표에 넣는 것을 잊으면 잡지 못한다. route 파일 자동 스캔은 현 규모에서 과하다고 보고 채택하지 않았다. 그래서 `CLAUDE.md` 테스트 관례에 "`requirePermission`을 단 route는 이 표에도 넣는다"를 적어 두었다.

### 3. 화면: 세션을 읽기 전에는 판정하지 않는다

`(authenticated)/layout.tsx`는 세션을 읽기 전에도 children을 렌더하고, 그동안 `gradeAtom`은 초기값 `'operator'`다. URL 직접 진입을 막는 `PermissionGate`는 `idAtom`이 채워지기 전에는 "불러오는 중..."만 보여준다. 그러지 않으면 super_admin에게도 "권한 없음"이 번쩍인다.

### 4. 읽기 전용 폼 — `fieldset disabled`만으로는 Radix Select를 못 막는다

권한 없는 등급에게 상세 화면을 읽기 전용으로 보여줄 때, 입력 영역을 `<fieldset disabled>`로 감싸면 native input·button은 브라우저가 한꺼번에 막는다. **Radix `SelectTrigger`는 예외다.** `pointerdown`으로 열리고 자기 `disabled` prop만 확인하므로(`@radix-ui/react-select`의 `handleOpen`), DOM의 disabled 상태를 무시하고 열린다. 그래서 fieldset에 `inert`도 함께 건다.

```tsx
<fieldset disabled={readOnly} inert={readOnly}>
  {/* 필드들 */}
</fieldset>
```

React 19는 `inert`를 boolean DOM 속성으로 전달한다. 저장 버튼을 숨기고 API가 403을 주므로 실제 저장은 어차피 막히지만, "읽기 전용"이라고 보여주는 화면에서 값이 바뀌어 보이면 안 된다.

공유 컴포넌트에 주의한다. 정보설정 폼 섹션 3개는 연동상품 수정 화면과 공유되므로(`.claude/rules/domain-design.md`), 읽기 전용은 섹션이 아니라 바깥 래퍼(`ShoppingSettingForm`)에만 건다.

## Why This Matters

- 2026-06-15에는 "등급이 3개로 고정이니 권한 매트릭스 같은 추상화 없이 문자열 비교로 충분하다, 조합이 복잡해지면 검토한다"고 판단했다. 결과적으로 추상화가 필요해진 이유는 **조합의 복잡도가 아니었다.** 같은 정책을 UI와 API가 따로 들고 있다는 것 자체가 어긋남의 원인이었다. 등급이 둘뿐이어도 정책을 두 곳에 적으면 어긋난다.
- UI만 막는 것은 보안이 아니다. 요청 한 줄로 우회된다. 반대로 API만 막으면 사용자는 눌러도 403이 나는 버튼을 본다. 둘 중 하나만 있는 상태는 어느 쪽이든 결함이다.

## When to Apply

- 새 쓰기 route를 만들 때 → 정책표에 키가 있는 동작이면 `requirePermission`, 없으면 `requireSession`. 가드를 달았으면 `routePermissions.test.ts`의 `CASES`에도 넣는다.
- 화면에 등급별 버튼을 추가할 때 → `usePermission('<도메인>.<동작>')`. `grade === '...'`를 직접 쓰지 않는다. 예외는 권한 판정이 아닌 상태 규칙뿐이다(`resolveNewUserStatus`).
- 정책을 바꿀 때 → `PERMISSIONS` 한 줄과 `permission.test.ts`의 기대값 한 줄을 함께 바꾼다.
- Radix 기반 폼을 읽기 전용으로 만들 때 → `fieldset disabled`에 `inert`를 같이 건다.

## Related

- `src/shared/utils/permission.ts`, `src/shared/utils/permission.test.ts` — 정책표와 전 칸 테스트
- `src/shared/utils/apiAuth.ts` — `requirePermission`
- `src/features/auth/hook/usePermission.ts`, `src/components/common/PermissionGate.tsx`
- `src/app/api/routePermissions.test.ts` — route 권한 거부 계약 테스트
- `[[api-route-session-auth-guard]]` — route 가드 패턴의 원형
- `[[user-hierarchy-ownerid-pattern]]` — 등급과 워크스페이스(`ownerId`) 구조
- 설계 문서(로컬 전용): `docs/superpowers/specs/2026-09-23-grade-permission-policy-design.md`
