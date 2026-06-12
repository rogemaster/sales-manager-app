import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { workspaceOwnerIdAtom } from '@/features/auth/store/auth.store';
import { CreateUserBody } from '../types/user.types';
import { createUser } from './createUser';

export const useCreateUser = () => {
  const workspaceOwnerId = useAtomValue(workspaceOwnerIdAtom);

  return useMutation({
    mutationFn: (body: CreateUserBody) => createUser(workspaceOwnerId, body),
  });
};
