'use client';
import { useEffect } from 'react';
import { ErrorStateCard } from '@/components/common/ErrorStateCard';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// 로그인·가입 화면과 (authenticated) 레이아웃 자체의 예외를 받는다. 레이아웃 밖이라 단독 화면으로 띄운다.
export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    // 메시지는 내부 정보라 화면에 보이지 않고 콘솔에만 남긴다.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <ErrorStateCard
        title="오류가 발생했습니다"
        description="화면을 표시하는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
