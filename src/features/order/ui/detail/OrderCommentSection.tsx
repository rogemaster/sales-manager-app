'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { OrderComment } from '../../types/order.types';
import { createOrderComment } from '../../api/createOrderComment';

type Props = {
  orderId: string;
  comments: OrderComment[];
  ownerId: string;
};

export const OrderCommentSection = ({ orderId, comments, ownerId }: Props) => {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => createOrderComment(orderId, content, ownerId),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['order-comments', orderId, ownerId] });
    },
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-4 w-[3px] rounded-full bg-primary" />
          <CardTitle className="text-sm">주문 코멘트</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">작성된 코멘트가 없습니다.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
                  <span className="text-xs font-medium">{comment.authorName}</span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="코멘트를 입력하세요"
            className="resize-none flex-1"
            rows={2}
          />
          <Button
            type="button"
            onClick={() => mutate()}
            disabled={!content.trim() || isPending}
          >
            저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
