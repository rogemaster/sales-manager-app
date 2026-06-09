import { useMutation } from '@tanstack/react-query';
import { updateProfile, UpdateProfileBody } from './updateProfile';

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
  });
};
