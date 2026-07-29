import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { registerProductsToMalls } from './registerProductsToMalls';
import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export const useRegisterProductsToMalls = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (items: MallRegistrationRequestItem[]) => registerProductsToMalls(workspaceOwnerId, items),
  });
};
