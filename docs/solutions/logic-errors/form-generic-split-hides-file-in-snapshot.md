---
title: 폼 제네릭이 화면마다 갈라져 File이 스냅샷에 섞여도 tsc가 잡지 못한다
date: 2026-09-01
category: logic-errors
module: features/mallLinkedProduct, features/products
problem_type: silent_data_loss
component: form_state
severity: high
applies_when:
  - 여러 화면이 같은 폼 섹션 컴포넌트를 공유하는데 화면마다 useForm의 제네릭이 다를 때
  - 폼 전용 타입(File 허용)과 도메인 타입(직렬화 가능한 값만)을 분리해 둔 프로젝트에서
  - 폼 값을 그대로 JSON.stringify로 서버에 보낼 때
symptoms:
  - 이미지를 골라 저장했는데 에러 없이 저장되고, 서버에 도착한 값만 {} 이다
  - 같은 섹션 컴포넌트를 쓰는 A화면은 정상인데 B화면만 값이 사라진다
  - 도메인 타입에는 File이 없는데 런타임에는 File이 들어 있다
tags:
  - react-hook-form
  - useformcontext
  - generics
  - json
  - file-upload
  - type-safety
  - silent-failure
---

# 폼 제네릭이 화면마다 갈라져 File이 스냅샷에 섞여도 tsc가 잡지 못한다

## 증상

연동상품 수정 화면(`/shopping/linked-products/[id]`)에서 메인이미지를 새로 고르고 저장하면, **에러 없이 저장에 성공하는데 스냅샷의 `mainImage`만 `{}`가 된다.** 등록·수정 화면에서는 같은 컴포넌트가 정상 동작한다.

## 원인

`ProductMainImageInfo`는 자기가 속한 폼의 타입을 **스스로 선언한다.**

```tsx
// ProductMainImageInfo.tsx
const { setValue } = useFormContext<ProductFormValues>(); // mainImage: File | string
setValue('mainImage', file); // File을 써넣는다
```

반면 그것을 렌더하는 화면은 다른 제네릭을 쓰고 있었다.

```tsx
// MallLinkedProductEditLayout.tsx (수정 전)
const productForm = useForm<Product>();      // mainImage: string
...
productSnapshot: productForm.getValues(),    // 타입상 string, 런타임은 File
```

`useFormContext<T>()`의 `T`는 **호출하는 쪽이 선언하는 값일 뿐, 실제 FormProvider가 들고 있는 폼과 대조되지 않는다.** 두 타입이 어긋나도 컴파일 에러가 나지 않는다. 그래서 `Product.mainImage: string`이라는 선언이 런타임에는 거짓이 되고, 그 값이 `JSON.stringify`를 지나며 `{}`로 바뀐다(File은 열거 가능한 자체 속성이 없다).

실패가 조용한 이유가 두 겹이다 — **타입 체커가 못 잡고**(제네릭이 갈라져서), **런타임도 안 터진다**(`JSON.stringify(File)`이 예외가 아니라 `{}`를 돌려주므로).

## 해결

화면의 폼 제네릭을 컴포넌트가 기대하는 타입으로 맞추고, 직렬화 직전에 도메인 타입으로 변환한다.

```tsx
// 1. 제네릭을 컴포넌트와 일치시킨다 — 이제 File이 타입에 보인다
const productForm = useForm<ProductFormValues>();

// 2. 저장 직전에 File → 업로드 → key로 변환한다
const buildSnapshots = async (record: MallLinkedProduct): Promise<MallLinkedProductSnapshots> => {
  const productValues = productForm.getValues();
  const mainImage = await resolveMainImageKey(productValues.mainImage);
  return { productSnapshot: { ...productValues, mainImage }, ... };
};
```

`Omit<Product, 'mainImage'> & { mainImage: File | string }` 형태로 폼 타입을 따로 두는 설계 자체는 옳다. **깨지는 지점은 타입 설계가 아니라 "그 타입을 화면마다 다시 선언한다"는 데 있다.**

## 판별 질문

**이 폼 섹션 컴포넌트를 쓰는 화면이 둘 이상인가? 그 화면들의 `useForm<T>` 제네릭이 전부 같은 `T`인가?**

다르다면 그 차이가 의도된 것인지 확인한다. 의도된 차이라면 컴포넌트를 공유하면 안 되고(→ [`ui-conventions.md`](../../../.claude/rules/ui-conventions.md)의 "검색 필터는 화면이 소유한다"와 같은 결론), 의도된 것이 아니라면 지금 조용히 어긋나 있는 것이다.

## 이걸 놓친 경로 — 기록해두는 이유

`Product.mainImage`가 `string | File` 유니온이던 시절에는 **이 화면의 동작이 지금과 똑같았다.** 그래서 R2 작업에서 유니온을 없애고 `string`으로 좁힐 때, 등록·수정 화면 두 곳만 `ProductFormValues`로 바꾸고 연동상품 화면은 손대지 않아도 tsc가 통과했다. 타입을 좁히는 리팩터가 "좁힌 타입을 실제로 지키는지"까지 검증해주지는 않는다 — **유니온을 제거할 때는 그 유니온을 소비하던 화면 전체를 grep으로 훑어야 한다**([`full-codebase-audit-before-type-refactor.md`](../conventions/full-codebase-audit-before-type-refactor.md)와 같은 교훈).

## Related

- [`json-stringify-drops-undefined-breaks-field-clearing.md`](json-stringify-drops-undefined-breaks-field-clearing.md) — 같은 계열(직렬화가 값을 조용히 삼킨다). 그쪽은 `undefined` 키 삭제, 이쪽은 `File → {}`
- [`user-input-blocked-by-type-not-sanitizer.md`](../architecture-patterns/user-input-blocked-by-type-not-sanitizer.md) — 같은 라운드에서 나온 반대 방향 사례(타입으로 값이 도달할 경로를 없앤 쪽)
- `docs/superpowers/plans/2026-09-01-product-image-r2-storage.md` — Task 4(타입 정리·폼 배선)
