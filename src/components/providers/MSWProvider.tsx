'use client';

import { ReactNode, useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { worker } = await import('@/mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      setIsReady(true);
    };

    if (!isReady) {
      init();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
