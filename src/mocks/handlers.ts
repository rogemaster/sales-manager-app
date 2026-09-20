import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { orderHandlers } from './handlers/orders';
import { collectionHandlers } from './handlers/collection';
import { shoppingSettingHandlers } from './handlers/shoppingSettings';
import { mallLinkedProductHandlers } from './handlers/mallLinkedProducts';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...orderHandlers,
  ...collectionHandlers,
  ...shoppingSettingHandlers,
  ...mallLinkedProductHandlers,
];
