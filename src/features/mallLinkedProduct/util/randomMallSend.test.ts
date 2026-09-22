import { describe, it, expect } from 'vitest';
import { judgeRandomSend } from './randomMallSend';

const SUCCESS = () => 0.99;
const FAIL = () => 0;

describe('judgeRandomSend', () => {
  it('신규 등록 성공이면 새 외부 코드를 발급한다', () => {
    const outcome = judgeRandomSend({ mallCode: 'COUP', hasPriorSuccess: false }, SUCCESS);
    expect(outcome.status).toBe('success');
    expect(outcome.externalProductId).toMatch(/^ext_COUP_/);
    expect(outcome.source).toBe('random');
  });

  it('수정 성공이면 기존 코드를 유지한다', () => {
    const outcome = judgeRandomSend(
      { mallCode: 'COUP', externalProductId: 'ext_COUP_old', hasPriorSuccess: true },
      SUCCESS,
    );
    expect(outcome.externalProductId).toBe('ext_COUP_old');
  });

  it('신규 등록 실패 + 같은 상품·몰 성공 이력이면 중복 사유', () => {
    const outcome = judgeRandomSend({ mallCode: 'COUP', hasPriorSuccess: true }, FAIL);
    expect(outcome).toMatchObject({ status: 'failed', errorMessage: '동일 상품이 이미 등록되어 있습니다' });
    expect(outcome.externalProductId).toBeUndefined();
  });

  it('신규 등록 실패 + 이력 없음이면 몰 사유', () => {
    expect(judgeRandomSend({ mallCode: 'KAKAOS', hasPriorSuccess: false }, FAIL).errorMessage).toBe(
      '상품명 글자 수 초과',
    );
    expect(judgeRandomSend({ mallCode: 'GMK', hasPriorSuccess: false }, FAIL).errorMessage).toBe(
      '외부 쇼핑몰 전송 실패',
    );
  });

  it('수정 실패는 중복 판정을 하지 않고 코드를 유지한다', () => {
    const outcome = judgeRandomSend(
      { mallCode: 'COUP', externalProductId: 'ext_COUP_old', hasPriorSuccess: true },
      FAIL,
    );
    expect(outcome).toMatchObject({
      status: 'failed',
      errorMessage: '외부 쇼핑몰 전송 실패',
      externalProductId: 'ext_COUP_old',
    });
  });
});
