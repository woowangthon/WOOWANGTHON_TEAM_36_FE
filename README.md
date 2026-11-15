# 우왕돈이다 (`WOOWANGTHON_TEAM_36_FE`)

충북대학교 소프트웨어학부 재학생을 위한 맞춤 장학금 매칭 서비스 **우왕돈이다**의 프론트엔드 저장소입니다.  
소프트웨어학부, AI부트캠프사업단, 한국장학재단의 장학 공지를 모아 학생 프로필과 비교하고 지원 가능 여부를 한눈에 확인할 수 있도록 제공합니다.

---

## 주요 기능

### 1. 인증 · 개인정보 동의 · 프로필 관리

- **로그인 / 회원가입** (`/login`, `/signup`)
  - 이메일 가입(6자리 인증번호 메일 확인 후 비밀번호 설정) 및 Google OAuth 로그인(`/api/auth/google/login`) 지원
  - `httpOnly` 쿠키 기반 세션 인증 및 `/auth/me` 상태에 따른 라우팅 가드(`비로그인 → /login`, `동의 전 → /consent`, `프로필 미입력 → /profile`)
- **개인정보 및 민감정보 동의** (`/consent`)
  - 필수 개인정보 수집·이용 동의와 선택 민감정보(다자녀·보훈·장애 특수자격) 동의를 분리하여 수집
- **프로필 입력 · 수정 및 계정 설정** (`/profile`)
  - 기본 정보(닉네임, 성별, 출생연도), 학적·성적(이수학기, 편입/외국인 여부, 직전학기 평점·이수학점, 전체 평점평균, AI부트캠프사업단 여부), 선택 조건(소득분위, 본인·부모 주소, 등록금 전액 감면 여부, 특수자격) 관리
  - 프로필 화면 내 민감정보 동의 다이얼로그, 민감정보 동의 철회, 알림 메일 수신 설정, 비밀번호 변경, 회원 탈퇴, 개인정보처리방침 열람 지원

### 2. 맞춤 장학금 탐색 및 관리

- **대시보드** (`/dashboard`)
  - 판정 결과별 탭(`지원 가능` / `확인 필요` / `전체`), 정렬(`마감 임박순` / `최신순`), 필터(`교내·교외`, `등록금성·생활비성`), 장학금명·출처 검색(URL 쿼리 동기화)
  - **빠른 확인(`UnlockHint`)**: 추가 조건 하나만 응답하면 판정이 확정되는 장학금을 질문 카드로 묶어 즉시 확인 가능
  - 곧 마감되는 장학금 및 바로가기 사이드 패널 제공
- **장학금 상세** (`/scholarships/:id`)
  - 조건별 체크리스트(`충족` / `미충족` / `확인 필요`), 원문 근거 및 추가 조건 직접 응답(`맞아요` / `안 맞아요`)
  - 알아 둘 내용(기본 조건·참고사항), 제출 서류, 원문 공지 및 첨부파일 안내, 같은 공지의 다른 장학금 링크
  - **관심(하트)** 및 **신청완료** 독립 토글 (Optimistic Update 적용)
- **내 정보 및 내 장학금** (`/my`)
  - 프로필 요약(캐릭터 아바타, 닉네임, 이메일, 학년·이수학기, 직전학기 평점)
  - `관심` 및 `신청완료`로 표시한 장학금 목록 모아보기

### 3. 관리자 및 공개 안내 페이지

- **관리자** (`/admin`): 출처별(`SW_DEPT`, `AIBC`, `KOSAF`) 최근 수집 실행 결과·오류 확인 및 추출 실패·대기 공지 재추출 요청
- **개인정보처리방침** (`/privacy`): 비로그인 상태에서도 열람 가능한 안내 페이지
- **알림 메일 수신 거부** (`/unsubscribe`): 메일 내 서명된 토큰으로 로그인 없이 알림 수신 해제

---

## 기술 스택

| 구분               | 사용 기술                                                                 |
| ------------------ | ------------------------------------------------------------------------- |
| Core               | React 19, TypeScript, Vite 8                                              |
| 라우팅 · 서버 상태 | React Router 8, TanStack Query 5                                          |
| 폼 · 검증          | React Hook Form, Zod                                                      |
| 스타일 · UI        | Tailwind CSS v4, shadcn/ui (`radix-ui`), Lucide React, Pretendard / Geist |
| API 타입 생성 · 목 | `openapi-typescript`, MSW (Mock Service Worker)                           |
| 테스트 · 품질      | Vitest, React Testing Library, Playwright, ESLint, Prettier               |

---

## 프로젝트 구조

```text
.
├─ e2e/                     # Playwright E2E 테스트 및 시연 계정 시드 스크립트
├─ public/                  # 파비콘, 로고, 아바타 이미지, MSW 워커
├─ src/
│  ├─ api/
│  │  ├─ hooks/             # 도메인별 TanStack Query 훅 (auth, profile, scholarships, admin)
│  │  └─ schema.gen.ts      # OpenAPI 스키마 기반 자동 생성 타입 (직접 수정 금지)
│  ├─ components/
│  │  ├─ auth/              # 라우팅 가드, 인증 레이아웃, Google 로그인 버튼, 동의 안내
│  │  ├─ form/              # 폼 필드, 비밀번호 입력 및 규칙 안내
│  │  ├─ layout/            # 공통 헤더·레이아웃, 사이드 패널
│  │  ├─ profile/           # 프로필 폼 스키마/유틸, 지역 선택, 아바타, 알림·비밀번호·동의 모달
│  │  ├─ scholarship/       # 장학금 카드, 필터 칩, 탭, 빠른 확인 카드, 날짜/상태 포맷터
│  │  └─ ui/                # shadcn/ui 기반 공통 UI 컴포넌트
│  ├─ lib/                  # QueryClient 설정, 조건 라벨, 비밀번호 검증, 공지 텍스트 유틸
│  ├─ mocks/                # MSW 브라우저/노드 핸들러 및 목 데이터
│  ├─ pages/                # 라우트별 페이지 및 컴포넌트 테스트
│  ├─ routes.tsx            # 앱 라우팅 및 가드 정의
│  └─ main.tsx              # 앱 진입점 (--mode mock 시 MSW 활성화)
├─ Dockerfile               # 로컬 통합 개발 컨테이너 이미지
├─ vercel.json              # Vercel /api 리라이트 및 SPA 라우팅 설정
└─ vite.config.ts           # Vite 개발 서버 프록시(/api) 및 Vitest 설정
```

---

## 시작하기

### 사전 요구사항

- Node.js (컨테이너 기준 `node:24-slim`)
- npm

### 설치

```bash
npm install
```

### 로컬 개발 서버 실행

**1. 백엔드 없이 MSW 목(Mock) API로 실행**

```bash
npm run dev:mock
```

- 브라우저에서 `http://localhost:5173`으로 접속합니다.
- `vite --mode mock`으로 실행되며 `src/mocks/`의 MSW 핸들러가 `/api/*` 요청을 처리합니다.

**2. 로컬 백엔드와 연동하여 실행**

```bash
npm run dev
```

- 기본값으로 `/api/*` 요청을 `http://localhost:8000`으로 프록시합니다(`/api` 접두어는 제거 후 전달).
- 프록시 대상 변경이 필요한 경우 `API_PROXY_TARGET` 환경변수를 설정할 수 있습니다. (브라우저에 노출되는 `VITE_*` 환경변수는 사용하지 않습니다.)

### 빌드 및 미리보기

```bash
npm run build
npm run preview
```

---

## API 연동 규칙 및 타입 생성

- 앱 코드는 백엔드 주소를 하드코딩하지 않고 항상 상대 경로 `/api/...`로 요청합니다.
  - **로컬 개발**: `vite.config.ts`의 `server.proxy`가 `/api`를 백엔드로 전달
  - **배포(Vercel)**: `vercel.json`의 `rewrites`가 `/api/:path*`를 백엔드로 전달
- API 요청/응답 타입은 `src/api/schema.gen.ts`만 사용합니다. 백엔드 OpenAPI 스키마가 변경된 경우 로컬 백엔드(`http://localhost:8000`)를 실행한 상태에서 아래 명령으로 재생성합니다.

```bash
npm run gen:api
```

---

## 테스트 및 코드 검사

```bash
# 단위 / 컴포넌트 테스트 (Vitest)
npm run test

# ESLint 및 Prettier 포맷 검사
npm run lint

# Prettier 포맷 자동 적용
npm run format
```

### E2E 테스트 및 시연 계정 시드 (Playwright)

실제 백엔드(`:8000`, `MAIL_MOCK=1`)와 DB가 실행 중일 때 전체 사용자 흐름을 검증할 수 있습니다.

```bash
# Playwright E2E 테스트 실행 (대상 URL 변경 시 E2E_BASE_URL 사용)
npm run e2e

# 시연용 가상 프로필 계정 4종 생성/갱신
DEMO_PASSWORD='<8자 이상 비밀번호>' npm run seed:demo
```

---

## 참고 문서

- 프론트엔드 구현 규칙: [`CLAUDE.md`](./CLAUDE.md)
- Git 브랜치 · 커밋 · PR 규칙: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
