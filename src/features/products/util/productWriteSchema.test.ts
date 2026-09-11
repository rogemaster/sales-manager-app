import { describe, expect, it } from 'vitest';
import { findProductWriteViolation, productWriteViolationMessage } from './productWriteSchema';

const valid = {
  name: '테스트 상품',
  categoryId: 'CAT-001',
  price: 10000,
  state: 'ON_SALE',
  deliveryType: 'FREE',
  deliveryPrice: 0,
  mainImage: 'https://example.com/main.png',
  detailPage: '<p>상세</p>',
  totalQuantity: 10,
  brand: '브랜드',
  manufacturer: '제조사',
  informationDisclosure: { key: '', id: '', name: '', fields: {} },
};

const combo = { values: { 색상: '빨강' }, quantity: 1, skuCode: '', optionPrice: 0 };

describe('findProductWriteViolation - 정상값', () => {
  it('규칙을 모두 지키면 null을 돌려준다', () => {
    expect(findProductWriteViolation(valid)).toBeNull();
  });

  it('선택 필드가 모두 있어도 통과한다', () => {
    const full = {
      ...valid,
      customerCode: 'C-1',
      netPrice: 5000,
      modelName: 'MD-1',
      modelId: 'A-1',
      keyWords: ['가', '나'],
      option: [combo],
      subOption: [],
      taxType: 'TAXABLE',
      adultProductType: 'GENERAL',
      originCountryCode: 'KR',
      originCountryEtc: '',
    };

    expect(findProductWriteViolation(full)).toBeNull();
  });
});

describe('findProductWriteViolation - 숫자', () => {
  it('판매가가 숫자가 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, price: 'abc' })).toBe("판매가는 0 이상의 정수여야 합니다: 'abc'");
  });

  it('음수 가격을 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, price: -50000 })).toBe("판매가는 0 이상의 정수여야 합니다: '-50000'");
  });

  it('소수점을 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, deliveryPrice: 2500.5 })).toBe(
      "배송비는 0 이상의 정수여야 합니다: '2500.5'",
    );
  });

  it('정수 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, totalQuantity: 2147483648 })).toBe(
      "총수량은 0 이상의 정수여야 합니다: '2147483648'",
    );
  });

  it('선택값인 공급가도 값이 있으면 같은 규칙을 본다', () => {
    expect(findProductWriteViolation({ ...valid, netPrice: -1 })).toBe("공급가는 0 이상의 정수여야 합니다: '-1'");
  });
});

describe('findProductWriteViolation - 글자 수', () => {
  it('상품명 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, name: '가'.repeat(201) })).toBe('상품명은 200자를 넘을 수 없습니다');
  });

  it('브랜드 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, brand: '가'.repeat(101) })).toBe('브랜드는 100자를 넘을 수 없습니다');
  });

  it('상세설명 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, detailPage: '가'.repeat(50001) })).toBe(
      '상세설명은 50000자를 넘을 수 없습니다',
    );
  });

  it('메인이미지 주소 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, mainImage: 'h'.repeat(2049) })).toBe(
      '메인이미지는 2048자를 넘을 수 없습니다',
    );
  });
});

describe('findProductWriteViolation - 개수', () => {
  it('키워드가 배열이 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, keyWords: '가,나' })).toBe('키워드의 형식이 올바르지 않습니다');
  });

  it('키워드 개수 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, keyWords: Array(21).fill('가') })).toBe(
      '키워드는 20개를 넘을 수 없습니다',
    );
  });

  it('옵션 조합 개수 상한을 넘으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, option: Array(1001).fill(combo) })).toBe(
      '옵션은 1000개를 넘을 수 없습니다',
    );
  });

  it('옵션 조합의 수량이 음수면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, option: [{ ...combo, quantity: -1 }] })).toBe(
      '옵션의 형식이 올바르지 않습니다',
    );
  });

  it('옵션 추가금액은 음수를 허용한다', () => {
    expect(findProductWriteViolation({ ...valid, option: [{ ...combo, optionPrice: -1000 }] })).toBeNull();
  });
});

describe('findProductWriteViolation - 열거', () => {
  it('판매상태가 코드가 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, state: '판매중' })).toBe(
      "판매상태에 사용할 수 없는 값입니다: '판매중'",
    );
  });

  it('배송정책이 코드가 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, deliveryType: '무료' })).toBe(
      "배송정책에 사용할 수 없는 값입니다: '무료'",
    );
  });

  it('부가세유형이 코드가 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, taxType: '과세' })).toBe(
      "부가세유형에 사용할 수 없는 값입니다: '과세'",
    );
  });

  it('성인상품여부가 코드가 아니면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, adultProductType: '일반' })).toBe(
      "성인상품여부에 사용할 수 없는 값입니다: '일반'",
    );
  });

  it('원산지코드가 목록에 없으면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, originCountryCode: '한국' })).toBe(
      "원산지에 사용할 수 없는 값입니다: '한국'",
    );
  });
});

describe('findProductWriteViolation - 규정정보', () => {
  it('null이면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, informationDisclosure: null })).toBe(
      '규정정보의 형식이 올바르지 않습니다',
    );
  });

  it('모양이 다르면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, informationDisclosure: { key: '' } })).toBe(
      '규정정보의 형식이 올바르지 않습니다',
    );
  });
});

describe('findProductWriteViolation - 부분 검사', () => {
  it('부분 모드는 없는 필드를 요구하지 않는다', () => {
    expect(findProductWriteViolation({ name: '이름만 바꾼다' }, 'partial')).toBeNull();
  });

  it('부분 모드에서도 보낸 필드는 검사한다', () => {
    expect(findProductWriteViolation({ price: -1 }, 'partial')).toBe("판매가는 0 이상의 정수여야 합니다: '-1'");
  });

  it('전체 모드는 필수 필드가 없으면 잡는다', () => {
    const withoutName = { ...valid, name: undefined };

    expect(findProductWriteViolation(withoutName)).toBe('상품명이 없습니다');
  });

  it('객체가 아니면 잡는다', () => {
    expect(findProductWriteViolation(null)).toBe('상품 데이터의 형식이 올바르지 않습니다');
  });
});

describe('findProductWriteViolation - 메시지에 싣는 값', () => {
  it('값이 길면 앞 50자까지만 싣는다', () => {
    const violation = findProductWriteViolation({ ...valid, state: '가'.repeat(120) });

    expect(violation).toBe(`판매상태에 사용할 수 없는 값입니다: '${'가'.repeat(50)}...'`);
  });
});

describe('findProductWriteViolation - null 처리', () => {
  it('선택 필드가 null이면 통과한다 — DB nullable 컬럼이 그대로 돌아온다', () => {
    expect(
      findProductWriteViolation({ ...valid, netPrice: null, customerCode: null, keyWords: null, option: null }),
    ).toBeNull();
  });

  it('부분 모드에서도 선택 필드 null은 통과한다', () => {
    expect(findProductWriteViolation({ netPrice: null, modelName: null }, 'partial')).toBeNull();
  });

  it('필수 필드가 null이면 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, name: null })).toBe('상품명의 형식이 올바르지 않습니다');
  });

  it('옵션 조합의 수량이 null이면 통과하고, 음수면 여전히 잡는다', () => {
    expect(findProductWriteViolation({ ...valid, option: [{ ...combo, quantity: null }] })).toBeNull();
    expect(findProductWriteViolation({ ...valid, option: [{ ...combo, quantity: -1 }] })).toBe(
      '옵션의 형식이 올바르지 않습니다',
    );
  });
});

describe('productWriteViolationMessage', () => {
  it('행 번호가 없으면 위반 문구를 그대로 돌려준다', () => {
    expect(productWriteViolationMessage("판매가는 0 이상의 정수여야 합니다: '-1'")).toBe(
      "판매가는 0 이상의 정수여야 합니다: '-1'",
    );
  });

  it('행 번호를 주면 앞에 붙인다', () => {
    expect(productWriteViolationMessage("판매가는 0 이상의 정수여야 합니다: '-1'", 3)).toBe(
      "3번째 행의 판매가는 0 이상의 정수여야 합니다: '-1'",
    );
  });
});
