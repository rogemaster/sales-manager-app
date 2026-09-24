import { homeHandlers } from './handlers/home';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';

export const handlers = [...homeHandlers, ...orderHandlers, ...collectionHandlers];
