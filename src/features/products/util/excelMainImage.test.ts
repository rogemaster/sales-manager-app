import { describe, expect, it, vi } from 'vitest';
import { IMAGE_IMPORT_FAILED_REASON, resolveExcelMainImages } from './excelMainImage';
import { UnauthorizedError } from '@/shared/utils/unauthorized';

type Item = { name: string; mainImage?: string | null };

const options = { concurrency: 2 };

describe('resolveExcelMainImages', () => {
  it('가져온 key로 mainImage를 바꾸고 입력 순서와 시트 행 번호를 유지한다', async () => {
    const importFn = vi.fn(async (url: string) => ({ ok: true as const, key: `images/usr_a/${url.slice(-5)}` }));

    const { resolved, failures } = await resolveExcelMainImages<Item>(
      [
        { name: 'A', mainImage: ' https://a.com/1.png ' },
        { name: 'B', mainImage: 'https://a.com/2.png' },
      ],
      [2, 3],
      importFn,
      options,
    );

    expect(importFn).toHaveBeenCalledWith('https://a.com/1.png');
    expect(resolved).toEqual([
      { product: { name: 'A', mainImage: 'images/usr_a/1.png' }, rowNumber: 2 },
      { product: { name: 'B', mainImage: 'images/usr_a/2.png' }, rowNumber: 3 },
    ]);
    expect(failures).toEqual([]);
  });

  it('실패한 행은 빼고, 요청 배열 index가 아니라 시트 행 번호로 실패를 기록한다', async () => {
    const importFn = vi.fn(async (url: string) =>
      url.includes('bad')
        ? { ok: false as const, reason: '이미지를 불러올 수 없습니다(HTTP 503).' }
        : { ok: true as const, key: 'images/usr_a/k.png' },
    );

    const { resolved, failures } = await resolveExcelMainImages<Item>(
      [
        { name: 'A', mainImage: 'https://a.com/ok.png' },
        { name: 'B', mainImage: 'https://a.com/bad.png' },
        { name: 'C', mainImage: 'https://a.com/ok2.png' },
      ],
      [2, 4, 5],
      importFn,
      options,
    );

    expect(resolved.map(({ product }) => product.name)).toEqual(['A', 'C']);
    expect(resolved.map(({ rowNumber }) => rowNumber)).toEqual([2, 5]);
    expect(failures).toEqual([{ rowNumber: 4, message: '[메인이미지] 이미지를 불러올 수 없습니다(HTTP 503).' }]);
  });

  it('가져오기 요청 자체가 실패하면 가져오지 못했다는 사유로 기록한다', async () => {
    const { failures } = await resolveExcelMainImages<Item>(
      [{ name: 'A', mainImage: 'https://a.com/1.png' }],
      [3],
      vi.fn().mockRejectedValue(new Error('network')),
      options,
    );

    expect(failures).toEqual([{ rowNumber: 3, message: `[메인이미지] ${IMAGE_IMPORT_FAILED_REASON}` }]);
  });

  it('가져오기 요청이 UnauthorizedError로 실패하면 실패 행으로 바꾸지 않고 그대로 던진다', async () => {
    await expect(
      resolveExcelMainImages<Item>(
        [{ name: 'A', mainImage: 'https://a.com/1.png' }],
        [3],
        vi.fn().mockRejectedValue(new UnauthorizedError()),
        options,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('빈 값·공백·null·undefined는 가져오기를 호출하지 않고 실패로 기록한다', async () => {
    const importFn = vi.fn();

    const { resolved, failures } = await resolveExcelMainImages<Item>(
      [
        { name: 'A', mainImage: '' },
        { name: 'B', mainImage: '   ' },
        { name: 'C', mainImage: null },
        { name: 'D' },
      ],
      [2, 3, 4, 5],
      importFn,
      options,
    );

    expect(importFn).not.toHaveBeenCalled();
    expect(resolved).toEqual([]);
    expect(failures.map(({ rowNumber }) => rowNumber)).toEqual([2, 3, 4, 5]);
    expect(failures[0].message).toBe('[메인이미지] 메인이미지가 비어 있습니다.');
  });
});
