import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';

export const handlers = [...orderHandlers, ...collectionHandlers];
