import React from 'react';
import { LoginContainer } from '@/features/auth/ui/login/LoginContainer';

const Page = () => {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginContainer />
      </div>
    </div>
  );
};

export default Page;
