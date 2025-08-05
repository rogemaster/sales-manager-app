"use client";

import { Card, CardContent } from '@/components/ui/card';
import { SignInSideSection } from '@/features/auth/ui/login/LoginSideBanner';
import { LoginForm } from '@/features/auth/ui/login/LoginForm';
import { useAuthForm } from '../../hook/useAuthForm';

export const LoginContainer = () => {
  const { formData, errors, isLoading, handleInputChange, handleLogin } = useAuthForm();

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <LoginForm formData={formData} errors={errors} isLoading={isLoading} handleInputChange={handleInputChange} handleLogin={handleLogin} />
          <SignInSideSection />
        </CardContent>
      </Card>
    </div>
  )
}