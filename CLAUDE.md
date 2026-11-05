# frontend 저장소

> 공통 규칙은 상위 폴더의 `CLAUDE.md`, 사양은 `../docs/장학금_매칭_서비스_계획서.md`를 따릅니다.

## 책임 (계획서 8.1)

- 계획서 7.1의 모든 화면을 만듭니다. backend 없이도 MSW 목 API로 개발할 수 있어야 합니다.

## 구조 (계획서 8.2)

```
vercel.json          # /api 프록시 + SPA 라우팅 (계획서 9.2)
src/
├─ api/
│  ├─ schema.gen.ts  # npm run gen:api 로 생성 (직접 수정 금지)
│  └─ hooks/         # TanStack Query 훅 (useMe, useScholarships ...)
├─ mocks/            # MSW 핸들러와 목 데이터
├─ pages/            # Login, Signup, Consent, Profile, Dashboard, Detail, MyList, Privacy, Admin
└─ components/
```

## 규칙

- **backend는 항상 상대 경로 `/api/...`로 호출합니다.** 절대 URL이나 `run.app` 주소를 코드에 넣지 않습니다. 로컬은 Vite proxy, 배포는 `vercel.json`이 전달합니다.
- 요청에는 `credentials: "include"`를 쓰지 않아도 됩니다(같은 출처). 토큰을 localStorage에 저장하지 않습니다. 인증은 httpOnly 쿠키뿐입니다.
- **API 타입은 `schema.gen.ts`만 씁니다.** 응답 타입을 손으로 정의하지 않습니다. backend 스키마가 바뀌면 `npm run gen:api`를 다시 실행합니다.
- MSW 목 데이터는 생성된 타입을 따릅니다. 판정 결과 3종(`지원 가능 / 확인 필요 / 지원 불가`)과 장학금 상태 3종(`OPEN / ALWAYS / CLOSED`)을 모두 포함합니다.
- **라우팅 가드**: `/auth/me` 결과로 판단합니다.
  - 비로그인 → `/login`
  - 동의 전 → `/consent`
  - 프로필 미입력 → `/profile`
  - `/privacy`는 로그인 없이 접근할 수 있습니다.
- Google 로그인 버튼은 `window.location.href = "/api/auth/google/login"`으로 이동합니다(fetch 아님).
- 폼은 React Hook Form + Zod로 만들고, 검증 규칙은 계획서 4.1 입력 방식을 따릅니다.
- 날짜는 한국 시간으로 표시하고, D-Day는 `apply_end` 기준으로 계산합니다. `ALWAYS`는 "상시·확인 필요"로 표시합니다.
- **지연 대책**(계획서 9.8):
  - TanStack Query 기본 `staleTime`은 5분입니다. 상태를 바꾸는 요청 뒤에는 관련 쿼리만 무효화합니다.
  - 로딩 중에는 스켈레톤 화면을 보여 줍니다.
  - 관심·신청완료·숨김은 optimistic update로 먼저 반영하고, 실패하면 되돌립니다.
  - 화면 하나에서 API를 여러 번 부르지 않습니다. 필요한 데이터가 응답에 없으면 backend 응답을 바꾸도록 요청합니다.
- UI는 Tailwind + shadcn/ui 컴포넌트를 씁니다. 모바일 화면 폭(360px)에서도 깨지지 않게 만듭니다.

## 명령

- 실행: `npm run dev` (포트 5173, `/api` → `http://localhost:8000`)
- 목 API로 실행: `npm run dev:mock`
- 테스트: `npm run test` (Vitest), E2E: `npm run e2e` (Playwright)
- 린트: `npm run lint`
- API 타입 생성: `npm run gen:api` (backend 실행 중이어야 함)

## 환경변수

없음. backend 주소는 `vercel.json`(배포)과 `vite.config.ts`(로컬)에만 있습니다.
