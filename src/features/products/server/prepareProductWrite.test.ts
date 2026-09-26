import { describe, expect, it, vi } from 'vitest';

// storage.ts가 최상단에서 import하는 'server-only'는 일반 Node 환경에서 throw한다(storage.test.ts 참고).
vi.mock('server-only', () => ({}));

import { PRODUCT_IMAGE_PREFIX } from '@/lib/storage';
import { IMAGE_NOT_OWNED_MESSAGE } from '@/shared/constant/upload.constant';
import { CUSTOMER_CODE_TYPE_MESSAGE } from '@/features/products/util/customerCode';
import { prepareProductWrite } from './prepareProductWrite';

const OWNER = 'owner-1';
const OWN_IMAGE = `${PRODUCT_IMAGE_PREFIX}/${OWNER}/a.png`;

const valid = {
  name: '테스트 상품',
  categoryId: 'CAT-001',
  price: 10000,
  state: 'ON_SALE',
  deliveryType: 'FREE',
  deliveryPrice: 0,
  mainImage: OWN_IMAGE,
  detailPage: '<p>상세</p>',
  totalQuantity: 10,
  brand: '브랜드',
  manufacturer: '제조사',
  informationDisclosure: { key: '', id: '', name: '', fields: {} },
};

describe('prepareProductWrite - 등록(full)', () => {
  it('규칙을 지키면 값을 돌려주고 customerCode를 정규화한다', () => {
    expect(prepareProductWrite({ ...valid, customerCode: '  C-1 ' }, OWNER)).toEqual({
      ok: true,
      values: { ...valid, customerCode: 'C-1' },
    });
    expect(prepareProductWrite(valid, OWNER)).toEqual({ ok: true, values: { ...valid, customerCode: null } });
  });

  it('서버가 정하는 필드와 모르는 필드는 버린다', () => {
    const result = prepareProductWrite(
      { ...valid, productId: 'P-1', ownerId: 'other', createDate: 'x', updateDate: 'y', extra: 1 },
      OWNER,
    );
    expect(result).toEqual({ ok: true, values: { ...valid, customerCode: null } });
  });

  it('글자·숫자가 아닌 customerCode는 정규화 전에 거부한다', () => {
    expect(prepareProductWrite({ ...valid, customerCode: true }, OWNER)).toEqual({
      ok: false,
      error: CUSTOMER_CODE_TYPE_MESSAGE,
    });
  });

  it('남의 네임스페이스 이미지 key를 거부한다', () => {
    const mainImage = `${PRODUCT_IMAGE_PREFIX}/other/a.png`;
    expect(prepareProductWrite({ ...valid, mainImage }, OWNER)).toEqual({ ok: false, error: IMAGE_NOT_OWNED_MESSAGE });
  });

  it('글자가 아닌 mainImage는 필드 규칙이 형식 오류로 잡는다', () => {
    const result = prepareProductWrite({ ...valid, mainImage: 5 }, OWNER);
    expect(result).toEqual({ ok: false, error: '메인이미지의 형식이 올바르지 않습니다' });
  });

  it('필수 필드가 없으면 거부한다', () => {
    expect(prepareProductWrite({ ...valid, name: undefined }, OWNER)).toEqual({
      ok: false,
      error: '상품명이 없습니다',
    });
  });
});

describe('prepareProductWrite - 수정(partial)', () => {
  it('보내지 않은 필드는 검사하지 않고 customerCode도 건드리지 않는다', () => {
    expect(prepareProductWrite({ price: 500 }, OWNER, 'partial')).toEqual({ ok: true, values: { price: 500 } });
  });

  it("customerCode ''는 null(코드 삭제)이 된다", () => {
    expect(prepareProductWrite({ customerCode: '' }, OWNER, 'partial')).toEqual({
      ok: true,
      values: { customerCode: null },
    });
  });

  it('customerCode: true가 기존 코드를 지우지 못하게 거부한다', () => {
    expect(prepareProductWrite({ customerCode: true }, OWNER, 'partial')).toEqual({
      ok: false,
      error: CUSTOMER_CODE_TYPE_MESSAGE,
    });
  });

  it('productId를 보내도 수정 값에 담기지 않는다', () => {
    expect(prepareProductWrite({ productId: 'P-2', price: 1 }, OWNER, 'partial')).toEqual({
      ok: true,
      values: { price: 1 },
    });
  });
});
