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
    <form className="p-6 md:p-8" onSubmit={handleLogin}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">어서 오세요!</h1>
        </div>
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
            <Link href="/findPassword" className="ml-auto text-sm underline-offset-2 hover:underline">
              <span className="text-sm text-gray-500">비밀번호 찾기</span>
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
          {/* 패스워드 보여줌 유무 버튼 UI */}
          {/* <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={togglePasswordVisibility}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="sr-only">{showPassword ? '패스워드 숨기기' : '패스워드 보기'}</span>
          </Button> */}
        </div>
        {errors && <p className="text-sm text-red-600">{errors.email || errors.password || errors.general}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          로그인
        </Button>
        <div className="text-center text-sm">
          <Link href="/register" className="underline underline-offset-4">
            <span className="text-sm text-gray-500">회원가입</span>
          </Link>
        </div>
      </div>
    </form>
  );
};
