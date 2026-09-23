'use client';

import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAtomValue } from 'jotai';
import { Button } from '@/components/ui/button';
import { useAlert } from '@/hooks/useAlert';
import { gradeAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';
import { CreateUserBody } from '@/features/account/types/user.types';
import { useCreateUser } from '@/features/account/api/useCreateUser';
import { resolveNewUserStatus } from '@/features/account/util/userStatus';
import { UserCreateForm } from './UserCreateForm';
import { CreateUserFormData, createUserSchema } from '@/features/account/util/userCreateSchema';

export const UserCreateLayout = () => {
  const grade = useAtomValue(gradeAtom);
  const router = useRouter();
  const { showAlert } = useAlert();
  const { mutate, isPending } = useCreateUser();

  // 버튼 문구용 예상값. 실제 상태는 서버가 정하고, 완료 알림은 응답의 status를 따른다.
  const willBePending = resolveNewUserStatus(grade) === 'pending';
  const gradeOptions = USER_GRADE_OPTIONS.filter((o) => o.id !== 'super_admin');

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', password: '', name: '', phone: '', bio: '', avatar: '' },
  });

  const onSubmit = (data: CreateUserFormData) => {
    const body: CreateUserBody = {
      ...data,
      avatar: data.avatar ?? '',
      bio: data.bio ?? '',
    };
    mutate(body, {
      onSuccess: (user) => {
        showAlert({
          type: 'success',
          message:
            user.status === 'pending'
              ? '등록 요청이 완료되었습니다. 슈퍼관리자 승인 후 활성화됩니다.'
              : '사용자가 등록되었습니다.',
          onConfirm: () => router.push('/account/user'),
        });
      },
      onError: (error) => {
        showAlert({
          type: 'error',
          message: error instanceof Error && error.message ? error.message : '사용자 등록에 실패했습니다.',
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 등록</h1>
        <p className="text-muted-foreground">새로운 사용자를 등록하세요.</p>
      </div>
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <UserCreateForm gradeOptions={gradeOptions} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push('/account/user')}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {willBePending ? '등록요청' : '등록'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};
