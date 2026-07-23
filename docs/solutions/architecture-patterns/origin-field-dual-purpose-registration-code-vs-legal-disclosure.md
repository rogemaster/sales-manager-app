---
title: 원산지는 "일반 원산지"(등록용 코드)와 "상품정보고시 원산지"(법정 표시 문자열)가 별개로 공존한다
date: 2026-07-19
category: architecture-patterns
module: features/products
problem_type: architecture_pattern
component: domain_modeling
severity: medium
applies_when:
  - 이미 유사한 필드(상품정보고시 등)가 존재하는데 새 필드를 추가하려 할 때 "이거 중복 아닌가?" 의심이 들 때
  - 원산지·인증정보처럼 여러 법률/시스템에서 각각 요구하는 표시 항목을 다룰 때
tags:
  - product
  - origin
  - informationDisclosure
  - domain-knowledge
  - duplication-check
---

# 원산지는 "일반 원산지"(등록용 코드)와 "상품정보고시 원산지"(법정 표시 문자열)가 별개로 공존한다

## Context

`Product`에 규정 정보 필드(원산지/부가세유형/성인상품여부)를 추가하는 브레인스토밍 중, 코드베이스에 이미 `Product.informationDisclosure.fields.origin`(상품정보고시 원산지 — 카테고리별 동적 필드 시스템, 자유텍스트, 대부분 카테고리에 `required: true`)이 존재한다는 걸 확인했다. 처음에는 새로 추가하려는 원산지 필드가 이 기존 필드와 중복이라고 판단해 "인증정보(KC)처럼 새 필드를 만들지 말고 기존 상품정보고시로 충분하다"고 결론 내리려 했다.

그런데 실제 오픈마켓 상품등록 UI를 다루는 사용자가 정정했다: **일반 원산지와 상품정보고시 원산지는 실제로 별개의 두 필드로 존재한다.**

- **일반 원산지**: 전자상거래 초기부터 있던 필수값. 코드값(예: 국가 코드)으로 API 전송되며, 상품정보고시와 별도 위치에 노출된다.
- **상품정보고시 원산지**(`informationDisclosure.fields.origin`): 이후 제정된 전자상거래법 표시 의무에 따른 항목. 문자열 그대로 API 전송되며, 카테고리별 법정 문구 형식을 따른다.

두 값은 생성 시점(법률)도, 전송 형식(코드 vs 문자열)도, 화면상 노출 위치도 다르다 — 겉보기엔 "같은 원산지 정보를 두 번 입력받는" 것처럼 보이지만 실제로는 서로 다른 시스템(몰의 등록 API 스키마 vs 전자상거래법 고시 표시)이 각각 요구하는 별개의 데이터다.

## Guidance

**필드가 겹쳐 보인다고 곧바로 "중복이니 하나로 합치자"고 판단하지 않는다.** 특히 다음 신호가 있으면 실제로는 별개 데이터일 가능성을 먼저 검토한다:

- 하나는 구조화된 코드값(사전 정의된 목록에서 선택, 시스템 간 매핑 목적), 다른 하나는 자유텍스트(사람이 읽는 법정 표시 문구 목적) — 목적 자체가 다르다.
- 하나는 카테고리 무관 공통 필드, 다른 하나는 카테고리별로 유무·필수 여부가 달라진다(예: 도서/여행패키지 카테고리는애초에 `informationDisclosure`에 `origin` 필드가 없음).
- 실제 대상 시스템(오픈마켓 UI, 법정 고시 팝업 등)에서 두 값이 물리적으로 다른 위치에 노출되는지 도메인 전문가(사용자)에게 확인한다.

이런 신호가 있다면 두 필드를 통합하지 말고 공존시킨다. 반대로 신호가 없다면(단순히 같은 개념의 필드명이 겹칠 뿐 목적·형식·소스가 동일하다면) 실제 중복이니 통합하는 게 맞다 — 이번 케이스에서도 KC 인증정보는 `informationDisclosure.fields.kc`만으로 충분하다고 판단해 별도 필드를 추가하지 않았다.

## Why This Matters

- 중복이라고 오판해 필드를 하나로 합치면, 나중에 몰 API 연동 시 코드값이 필요한 자리에 자유텍스트가 들어가거나 반대의 문제가 생긴다.
- 반대로 진짜 중복(KC 인증정보 등)을 성급하게 별도 필드로 다시 만들면 데이터 정합성 리스크(같은 사실을 두 곳에 따로 입력·유지)가 생긴다.
- 판단 기준은 "필드명이 같아 보이는가"가 아니라 "저장 형식과 소비 주체(어느 시스템이 이 값을 쓰는가)가 같은가"다.

## When to Apply

- 새 필드가 기존 필드와 이름/개념이 겹쳐 보일 때, 코드만 보고 판단하지 말고 실제 업무 프로세스(이 값이 어디로 전송되고 어떻게 쓰이는지)를 먼저 확인한다.
- 확신이 서지 않으면 도메인 지식이 있는 사용자에게 직접 묻는다 — 이번에도 컨트롤러의 첫 판단(중복이니 스킵)은 틀렸고, 사용자의 실무 지식으로 정정됐다.

## Related

- `[[product-vs-shoppingsetting-compliance-field-boundary]]` — 같은 브레인스토밍에서 함께 확정된 엔티티 배치 결정
- `src/features/products/constant/informationDisclosure.constants.ts` — 상품정보고시 원산지(`origin`)/KC 인증(`kc`) 필드 정의
- `src/features/products/types/product.types.ts` — `originCountryCode`/`originCountryEtc`(신규, 코드값) vs `informationDisclosure.fields.origin`(기존, 자유텍스트) 공존
- `docs/superpowers/specs/2026-07-19-product-compliance-fields-design.md` 섹션 2 — 원 설계 결정 배경
