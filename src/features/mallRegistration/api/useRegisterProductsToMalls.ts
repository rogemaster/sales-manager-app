import { useMutation } from '@tanstack/react-query';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { registerProductsToMalls } from './registerProductsToMalls';

export const useRegisterProductsToMalls = () => {
  return useMutation({
    mutationFn: (items: MallLinkedProductRequestItem[]) => registerProductsToMalls(items),
  });
};
