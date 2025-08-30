'use client';

import { AlertContext } from '@/hooks/useAlert';
import { AlertOptions } from '@/types/CommonInterface';
import { useCallback, useMemo, useState } from 'react';
import { CommonAlertDialog } from './CommonAlertDialog';

interface AlertProviderProps {
  children: React.ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
    setIsOpen(true);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // 애니메이션이 끝난 후 옵션 초기화
      setTimeout(() => {
        setAlertOptions(null);
      }, 200);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      showAlert,
    }),
    [showAlert],
  );

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <CommonAlertDialog open={isOpen} onOpenChange={handleOpenChange} options={alertOptions} />
    </AlertContext.Provider>
  );
}
