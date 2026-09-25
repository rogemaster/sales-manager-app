import { useMutation } from '@tanstack/react-query';
import { updateProfile } from './updateProfile';
import { ProfileEditFormData } from '../util/profileEditSchema';

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: (body: ProfileEditFormData) => updateProfile(body),
  });
};
