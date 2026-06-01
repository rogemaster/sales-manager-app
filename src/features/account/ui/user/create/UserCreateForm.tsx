'use client';

import { z } from 'zod';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { FilterOption } from '@/types/common.type';

export const createUserSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.'),
  grade: z.enum(['super_admin', 'admin', 'operator'], { message: '등급을 선택해주세요.' }),
  name: z.string().min(1, '이름을 입력해주세요.'),
  phone: z
    .string()
    .min(1, '연락처를 입력해주세요.')
    .regex(/^(0[0-9]{1,2})-?([0-9]{3,4})-?([0-9]{4})$/, '올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)'),
  avatar: z.string().optional(),
  bio: z.string().optional(),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

interface UserCreateFormProps {
  gradeOptions: FilterOption[];
}

export const UserCreateForm = ({ gradeOptions }: UserCreateFormProps) => {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<CreateUserFormData>();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setValue('avatar', reader.result as string);
    reader.readAsDataURL(file);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>필수 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <Input id="email" type="email" {...register('email')} placeholder="이메일을 입력하세요." />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 *</Label>
            <Input id="password" type="password" {...register('password')} placeholder="임시 비밀번호를 입력하세요." />
            {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
          </div>

          <Controller
            name="grade"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <FilterSelect
                  label="사용자 등급 *"
                  divClassName="space-y-2"
                  triggerClassName="w-full"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  options={gradeOptions}
                  placeholder="등급을 선택하세요."
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />

          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input id="name" type="text" {...register('name')} placeholder="이름을 입력하세요." />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">연락처 *</Label>
            <Input id="phone" type="tel" {...register('phone')} placeholder="연락처를 입력하세요. (예: 010-1234-5678)" />
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>선택 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="avatar">프로필 사진</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">소개</Label>
            <Textarea id="bio" {...register('bio')} placeholder="간단한 소개를 입력하세요." rows={4} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
