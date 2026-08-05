import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { MallLinkedProductRequestItem } from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { registerProductsToMalls } from './registerProductsToMalls';

export const useRegisterProductsToMalls = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);

  return useMutation({
    mutationFn: (items: MallLinkedProductRequestItem[]) => registerProductsToMalls(workspaceOwnerId, email, items),
  });
};
