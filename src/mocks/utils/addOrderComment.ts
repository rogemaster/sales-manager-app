import { OrderComment } from '@/features/order/types/order.types';
import { MOCK_ORDER_COMMENTS } from '../data/MockOrderExtrasData';

export const addMockOrderComment = (orderId: string, content: string): OrderComment => {
  if (!MOCK_ORDER_COMMENTS[orderId]) {
    MOCK_ORDER_COMMENTS[orderId] = [];
  }
  const newComment: OrderComment = {
    id: `comment_${Date.now()}`,
    content,
    authorName: '담당자',
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  };
  MOCK_ORDER_COMMENTS[orderId].push(newComment);
  return newComment;
};
