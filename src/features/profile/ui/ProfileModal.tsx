'use client';

import { useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getUserInfoAtom } from '@/features/auth/store/auth.store';
import { USER_GRADE_OPTIONS } from '@/features/account/constant/user.constants';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const Field = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex gap-4">
    <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}</span>
    <span className="text-sm">{value || '-'}</span>
  </div>
);

export const ProfileModal = ({ open, onOpenChange }: Props) => {
  const { avatar, name, email, grade, phone, company, bio } = useAtomValue(getUserInfoAtom);
  const router = useRouter();
  const gradeLabel = USER_GRADE_OPTIONS.find((o) => o.id === grade)?.name ?? grade;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로필</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-6 py-2">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-lg">{name.charAt(0) || '?'}</AvatarFallback>
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
        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              router.push('/profile/edit');
            }}
          >
            프로필 수정
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
