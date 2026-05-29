import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserDateFilter } from './components/UserDateFilter';
import { UserGradeFilter } from './components/UserGradeFilter';
import { UserSearchInput } from './components/UserSearchInput';

export const UserSearchFilterSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>검색 및 필터</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <UserDateFilter />
          <UserGradeFilter />
          <UserSearchInput />
        </div>
      </CardContent>
    </Card>
  );
};
