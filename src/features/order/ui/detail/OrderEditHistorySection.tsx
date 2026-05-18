'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { OrderEditHistory } from '../../types/order.types';

type Props = {
  editHistory: OrderEditHistory[];
};

export const OrderEditHistorySection = ({ editHistory }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (editHistory.length === 0) return null;

  const latest = editHistory[editHistory.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle>수정이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            <span className="text-muted-foreground">최종 수정: </span>
            <span className="font-medium">{latest.modifiedAt}</span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span className="text-muted-foreground">수정자: </span>
            <span className="font-medium">{latest.modifiedBy}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            수정이력 전체보기
            {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
        {isExpanded && (
          <div className="space-y-2 border-t pt-3">
            {editHistory.map((history) => (
              <div key={history.id} className="text-sm border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{history.modifiedAt}</span>
                  <span className="font-medium">{history.modifiedBy}</span>
                </div>
                {history.changedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    변경 필드: {history.changedFields.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
