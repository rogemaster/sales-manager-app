import { authHandlers } from './handlers/auth';
import { homeHandlers } from './handlers/home';
import { productHandlers } from './handlers/products';
import { orderHandlers } from './handlers/orders';
import { mallAccountHandlers } from './handlers/mallAccounts';
import { collectionHandlers } from './handlers/collection';
import { shoppingAccountHandlers } from './handlers/shoppingAccounts';
import { shoppingSettingHandlers } from './handlers/shoppingSettings';

export const handlers = [
  ...authHandlers,
  ...homeHandlers,
  ...productHandlers,
  ...orderHandlers,
  ...mallAccountHandlers,
  ...collectionHandlers,
  ...shoppingAccountHandlers,
  ...shoppingSettingHandlers,
];
