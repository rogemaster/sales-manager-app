import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';

export const handlers = [...authHandlers, ...homeHandlers, ...orderHandlers, ...collectionHandlers];
