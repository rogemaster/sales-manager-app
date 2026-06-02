import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Errors, LoginInfo } from '../../types/Auth';

type SignInFormProps = {
  formData: LoginInfo;
  errors: Errors | undefined;
  isLoading: boolean;
  handleInputChange: (field: keyof LoginInfo, value: string) => void;
  handleLogin: (e: React.FormEvent) => void;
};

export const LoginForm = ({ formData, errors, isLoading, handleInputChange, handleLogin }: SignInFormProps) => {
  return (
    <form className="p-8 md:p-10" onSubmit={handleLogin}>
      <div className="flex flex-col gap-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black text-primary-foreground">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
          <p className="text-sm text-muted-foreground">계정 정보를 입력해 주세요.</p>
        </div>

        {/* 폼 필드 */}
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="/findPassword" className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:underline">
                비밀번호 찾기
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
            />
          </div>
        </div>

        {errors && <p className="text-sm text-destructive">{errors.email || errors.password || errors.general}</p>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '로그인 중...' : '로그인'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{' '}
          <Link href="/register" className="text-foreground underline underline-offset-4">
            회원가입
          </Link>
        </div>
      </div>
    </form>
  );
};
