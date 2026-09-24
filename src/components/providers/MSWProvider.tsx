'use client';

import { ReactNode, useEffect, useState } from 'react';

// 로그아웃 후 재로그인하면 (authenticated) 레이아웃이 다시 마운트된다. worker는 한 번만 띄운다.
let workerStart: Promise<unknown> | null = null;

const startWorker = () => {
  workerStart ??= import('@/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
  return workerStart;
};

export function MSWProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startWorker().then(() => {
      if (!cancelled) setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
