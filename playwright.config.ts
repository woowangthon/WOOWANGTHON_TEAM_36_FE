import { defineConfig, devices } from '@playwright/test'

// E2E 테스트(T33, 계획서 10장 5단계). 로컬 compose 기준입니다.
// backend(:8000)와 DB는 미리 띄워 둡니다: backend 폴더에서 `docker compose up`.
// frontend(:5173)는 떠 있으면 그대로 쓰고, 없으면 `npm run dev`로 띄웁니다.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
