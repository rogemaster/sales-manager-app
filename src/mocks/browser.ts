import { setupServer } from 'msw/node';
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

if (typeof window === 'undefined') {
  const server = setupServer(...handlers);
  server.listen();
} else {
  const worker = setupWorker(...handlers);
  worker.start();
}
