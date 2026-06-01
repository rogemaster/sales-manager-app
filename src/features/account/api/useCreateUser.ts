import { useMutation } from '@tanstack/react-query';
import { CreateUserBody } from '../types/user.types';
import { createUser } from './createUser';

export const useCreateUser = () => {
  return useMutation({
    mutationFn: (body: CreateUserBody) => createUser(body),
  });
};
