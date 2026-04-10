'use client';

import { ReactNode, useEffect, useState } from 'react';

// 클라이언트 컴포넌트 Provider
export function MSWProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (process.env.NODE_ENV === 'development') {
        const { worker } = await import('@/mocks/browser');
        await worker.start({
          onUnhandledRequest: 'bypass',
        });
        setIsReady(true);
      }
    };

    if (!isReady) {
      init();
    }
  }, [isReady]);

  if (process.env.NODE_ENV === 'development' && !isReady) {
    return null; // MSW가 준비될 때까지 렌더링 지연
  }

  return <>{children}</>;
}
