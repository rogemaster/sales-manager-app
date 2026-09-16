'use client';

import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useAlert } from '@/hooks/useAlert';
import { checkCustomerCodes } from '../../api/checkCustomerCodes';
import { ProductFormValues } from '../../types/product.types';
import {
  CUSTOMER_CODE_CHECK_FAILED_MESSAGE,
  formatCustomerCodeDuplicateMessage,
  normalizeCustomerCode,
} from '../../util/customerCode';

/**
 * 제출 직전, 이미지를 R2에 올리기 전에 고객사 상품코드 중복을 확인한다. 통과하면 true.
 * mutation 안에서 확인하지 않는 이유: 중복이 onError 알림으로 섞이면 "입력칸 아래 표시"와 경로가 갈라진다.
 */
export const useCustomerCodeAvailability = (form: UseFormReturn<ProductFormValues>, excludeProductId?: string) => {
  const { showAlert } = useAlert();
  const { setError, setFocus, clearErrors } = form;

  return useCallback(
    async (value: unknown): Promise<boolean> => {
      clearErrors('customerCode');
      const code = normalizeCustomerCode(value);
      if (code === null) return true;

      try {
        const [duplicate] = await checkCustomerCodes([code], excludeProductId);
        if (!duplicate) return true;

        setError('customerCode', {
          type: 'manual',
          message: formatCustomerCodeDuplicateMessage(duplicate.code, duplicate.existingCode),
        });
        setFocus('customerCode');
        return false;
      } catch {
        showAlert({ type: 'error', message: CUSTOMER_CODE_CHECK_FAILED_MESSAGE });
        return false;
      }
    },
    [clearErrors, setError, setFocus, showAlert, excludeProductId],
  );
};
