'use client';

import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';

const Field = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex gap-4">
    <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="text-sm">{value || '-'}</span>
  </div>
);

export const ProfileLayout = () => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const router = useRouter();
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">프로필</h1>
        <Button onClick={() => router.push('/profile/edit')}>프로필 수정</Button>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-[3px] rounded-full bg-primary" />
            <CardTitle className="text-sm">프로필 정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-xl">{name.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-base font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
              <Badge variant="secondary">{gradeLabel}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="연락처" value={phone} />
            <Field label="소속" value={company} />
            <Field label="소개" value={bio} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
