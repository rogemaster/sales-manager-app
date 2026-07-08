import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingDateFilter } from './components/SettingDateFilter';
import { SettingMallFilter } from './components/SettingMallFilter';
import { SettingMallAccountFilter } from './components/SettingMallAccountFilter';
import { SettingSearchInput } from './components/SettingSearchInput';

export const ShoppingSettingSearchFilterSection = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">검색 및 필터</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="px-6 py-1">
            <SettingDateFilter />
          </div>
          <div className="px-6 py-1 flex items-center gap-8">
            <SettingMallFilter />
            <SettingMallAccountFilter />
          </div>
          <div className="px-6 py-1">
            <SettingSearchInput />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
