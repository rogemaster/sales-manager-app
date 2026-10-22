import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  title: string;
  description: string;
  /** 있으면 '다시 시도' 버튼을 띄운다 — error.tsx의 reset. 404처럼 다시 시도할 게 없으면 생략한다. */
  onRetry?: () => void;
}

/** error.tsx·not-found.tsx가 함께 쓰는 안내 카드. 버튼 구성이 화면마다 갈리지 않게 한 곳에 둔다. */
export const ErrorStateCard = ({ title, description, onRetry }: Props) => {
  return (
    <Card className="w-full max-w-md overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex justify-end gap-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              다시 시도
            </Button>
          )}
          <Button asChild>
            <Link href="/home">홈으로</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
