import { useCallback } from 'react';

interface DaumPostcodeData {
  zonecode: string;
  address: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeData) => void }) => { open: () => void };
    };
  }
}

interface PostcodeResult {
  zipCode: string;
  address: string;
}

export const useDaumPostcode = (onComplete: (result: PostcodeResult) => void) => {
  const openPostcode = useCallback(() => {
    if (typeof window === 'undefined' || !window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        onComplete({ zipCode: data.zonecode, address: data.address });
      },
    }).open();
  }, [onComplete]);

  return { openPostcode };
};
