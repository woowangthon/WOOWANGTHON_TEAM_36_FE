import { setupServer } from 'msw/node'

import { handlers } from './handlers'

// Vitest에서 쓰는 목 서버입니다.
export const server = setupServer(...handlers)
