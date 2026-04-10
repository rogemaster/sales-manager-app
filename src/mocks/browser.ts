import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// MSW 클라이언트용
export const worker = setupWorker(...handlers);
