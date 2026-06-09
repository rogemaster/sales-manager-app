'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAlert } from '@/hooks/useAlert';
import { getUserInfoAtom, setUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { useUpdateProfile } from '@/features/profile/api/useUpdateProfile';
import { phoneSchemaRequired } from '@/shared/utils/phone';

const profileEditSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  phone: phoneSchemaRequired(),
  company: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

export const ProfileEditLayout = () => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const setUserInfo = useSetAtom(setUserInfoAtom);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mutate, isPending } = useUpdateProfile();
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: { name, phone, company: company || '', bio: bio || '' },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    mutate(
      { email, ...data },
      {
        onSuccess: (updated) => {
          setUserInfo(updated);
          showAlert({
            type: 'success',
            message: '저장되었습니다.',
            onConfirm: () => router.back(),
          });
        },
        onError: () => {
          showAlert({ type: 'error', message: '저장에 실패했습니다.' });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">프로필 수정</h1>
        <p className="text-muted-foreground">기본 정보를 수정하세요.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/50 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full bg-primary" />
              <CardTitle className="text-sm">프로필 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="text-lg">{name.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{email}</p>
                <Badge variant="secondary">{gradeLabel}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" {...register('name')} placeholder="이름을 입력하세요." />
                {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">연락처 *</Label>
                <Input id="phone" type="tel" {...register('phone')} placeholder="연락처를 입력하세요. (예: 010-1234-5678)" />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">소속</Label>
                <Input id="company" {...register('company')} placeholder="소속을 입력하세요." />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <Textarea id="bio" {...register('bio')} placeholder="간단한 소개를 입력하세요." rows={4} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
