import { Provider as JotaiProvider } from 'jotai';
import { ReactNode } from 'react';

interface JotaiProviderProps {
  children: ReactNode;
}

export const ExcelProvider = ({ children }: JotaiProviderProps) => {
  return <JotaiProvider>{children}</JotaiProvider>;
};
