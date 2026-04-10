import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSW 서버/테스트용
export const server = setupServer(...handlers);
