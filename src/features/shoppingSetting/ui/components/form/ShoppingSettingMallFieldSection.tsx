import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ShoppingSettingMallFieldSection = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">쇼핑몰별 필드</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">쇼핑몰별 필드는 준비 중입니다.</p>
      </CardContent>
    </Card>
  );
};
