import { describe, it, expect, vi } from 'vitest';
import { MutationObserver } from '@tanstack/react-query';
import { createAppQueryClient } from './appQueryClient';
import { UnauthorizedError } from './unauthorized';

type RetryFn = (failureCount: number, error: unknown) => boolean;

describe('createAppQueryClient', () => {
  it('쿼리가 401로 실패하면 onUnauthorized를 부르고 재시도하지 않는다', async () => {
    const onUnauthorized = vi.fn();
    const client = createAppQueryClient(onUnauthorized);
    const queryFn = vi.fn(async () => {
      throw new UnauthorizedError();
    });

    await client.fetchQuery({ queryKey: ['a'], queryFn }).catch(() => {});

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('mutation이 401로 실패해도 onUnauthorized를 부른다', async () => {
    const onUnauthorized = vi.fn();
    const client = createAppQueryClient(onUnauthorized);
    const observer = new MutationObserver(client, {
      mutationFn: async () => {
        throw new UnauthorizedError();
      },
    });

    await observer.mutate().catch(() => {});

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('여러 건이 401이어도 한 번만 부른다', async () => {
    const onUnauthorized = vi.fn();
    const client = createAppQueryClient(onUnauthorized);
    const fail = async () => {
      throw new UnauthorizedError();
    };

    await Promise.all([
      client.fetchQuery({ queryKey: ['a'], queryFn: fail }).catch(() => {}),
      client.fetchQuery({ queryKey: ['b'], queryFn: fail }).catch(() => {}),
    ]);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('401이 아닌 오류는 부르지 않는다', async () => {
    const onUnauthorized = vi.fn();
    const client = createAppQueryClient(onUnauthorized);
    const observer = new MutationObserver(client, {
      mutationFn: async () => {
        throw new Error('저장 실패');
      },
    });

    await observer.mutate().catch(() => {});

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('쿼리 재시도: 401은 안 하고, 그 외는 3회까지', () => {
    const retry = createAppQueryClient(vi.fn()).getDefaultOptions().queries?.retry as RetryFn;
    expect(retry(0, new UnauthorizedError())).toBe(false);
    expect(retry(0, new Error())).toBe(true);
    expect(retry(2, new Error())).toBe(true);
    expect(retry(3, new Error())).toBe(false);
  });
});
