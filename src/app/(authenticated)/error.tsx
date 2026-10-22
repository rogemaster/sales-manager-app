'use client';
import { useEffect } from 'react';
import { ErrorStateCard } from '@/components/common/ErrorStateCard';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// 로그인 후 화면의 렌더 예외. 레이아웃(사이드바·헤더) 안쪽에 떠서 다른 메뉴로 바로 이동할 수 있다.
// 레이아웃 자체의 예외는 여기서 못 받고 src/app/error.tsx로 간다.
export default function AuthenticatedError({ error, reset }: Props) {
  useEffect(() => {
    // 메시지는 내부 정보라 화면에 보이지 않고 콘솔에만 남긴다.
    console.error(error);
  }, [error]);

  return (
    <div className="flex justify-center py-16">
      <ErrorStateCard
        title="오류가 발생했습니다"
        description="화면을 표시하는 중 문제가 생겼습니다. 다시 시도하거나 다른 메뉴로 이동해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
