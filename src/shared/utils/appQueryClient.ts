import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isUnauthorizedError } from './unauthorized';

// TanStack Query 기본 재시도 횟수와 같다. 401 외에는 기존 동작을 유지한다.
const DEFAULT_QUERY_RETRY = 3;

/**
 * 로그인 후 화면의 QueryClient. 401을 한 곳에서 받아 onUnauthorized를 한 번만 부른다.
 * 여러 쿼리가 동시에 401을 받아도 로그아웃은 한 번이면 된다.
 */
export const createAppQueryClient = (onUnauthorized: () => void): QueryClient => {
  let notified = false;
  const handleError = (error: unknown) => {
    if (notified || !isUnauthorizedError(error)) return;
    notified = true;
    onUnauthorized();
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !isUnauthorizedError(error) && failureCount < DEFAULT_QUERY_RETRY,
      },
    },
  });
};
