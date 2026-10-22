import { ErrorStateCard } from '@/components/common/ErrorStateCard';

// 없는 주소는 어느 route group 레이아웃도 거치지 않아 단독 화면으로 뜬다.
// '홈으로'는 로그인 전이면 middleware가 /login으로 보낸다.
export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <ErrorStateCard title="페이지를 찾을 수 없습니다" description="주소가 잘못되었거나 더 이상 없는 페이지입니다." />
    </div>
  );
}
