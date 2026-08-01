import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { emailAtom, workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { registerProductsToMalls } from './registerProductsToMalls';
import { MallRegistrationRequestItem } from '../types/mallRegistration.types';

export const useRegisterProductsToMalls = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);
  const email = useAtomValue(emailAtom);

  return useMutation({
    mutationFn: (items: MallRegistrationRequestItem[]) => registerProductsToMalls(workspaceOwnerId, email, items),
  });
};
