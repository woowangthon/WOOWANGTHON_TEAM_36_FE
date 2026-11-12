import { Link } from 'react-router'

// 개인정보처리방침 (계획서 4.2). 로그인 없이 볼 수 있는 정적 페이지이며 Google OAuth 동의 화면에도 링크합니다.
// 문안은 운영 담당자가 검토합니다(T24 사람 할 일).

const UPDATED_AT = '2026년 11월 11일'
const CONTACT = 'pgmo0329@naver.com'

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. 수집하는 항목',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          필수: 이메일, 비밀번호(암호화된 값만 저장), 닉네임, 성별, 출생연도, 성적(직전학기·전체
          평점, 100점 환산, 직전학기 이수학점), 이수학기, AI부트캠프사업단 양성인재 여부
        </li>
        <li>선택: 소득분위, 본인·부모 주소(시/도, 시/군/구까지), 등록금 전액 감면 여부</li>
        <li>민감정보(별도 동의 시): 특수자격(다자녀·보훈·장애)</li>
        <li>Google 로그인 시: Google 계정 식별자와 이메일</li>
        <li>
          장학금 상세에서 직접 답한 경우: 추가 조건마다 &lsquo;해당돼요 / 아니에요&rsquo; 답과 답한
          시각
        </li>
      </ul>
    ),
  },
  {
    title: '2. 이용 목적',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          장학금 공지의 지원 조건과 입력한 정보를 비교해 지원 가능 여부를 보여 주기 위해서만 씁니다.
          비교는 서버의 규칙 코드가 하며, 입력한 정보는 AI(공지 분석에 쓰는 Gemini)에 보내지
          않습니다.
        </li>
        <li>
          이메일 주소는 로그인과 가입 인증번호 발송에 사용합니다. 그 밖의 안내·광고 메일은 보내지
          않습니다.
        </li>
      </ul>
    ),
  },
  {
    title: '3. 보관 기간과 삭제',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>회원 탈퇴 시 계정·프로필·관심/신청완료 기록·추가 조건 답을 즉시 삭제합니다.</li>
        <li>민감정보 동의를 철회하면 특수자격 값을 즉시 삭제합니다.</li>
        <li>탈퇴와 동의 철회는 프로필 화면에서 직접 할 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: '4. 안전성 확보 조치',
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          소득분위, 본인·부모 주소, 특수자격, 추가 조건 답은 AES-256-GCM으로 암호화해 저장합니다.
        </li>
        <li>비밀번호는 Argon2로 해시해 원문을 저장하지 않습니다.</li>
        <li>로그인 정보는 브라우저 스크립트가 읽을 수 없는 쿠키(httpOnly)로만 주고받습니다.</li>
        <li>서버 기록(로그)에는 프로필 값, 추가 조건 답, 비밀번호, 토큰을 남기지 않습니다.</li>
        <li>가입 인증번호는 저장하지 않으며, 10분이 지나면 쓸 수 없습니다.</li>
      </ul>
    ),
  },
  {
    title: '5. 제3자 제공·처리 위탁',
    body: (
      <p>
        개인정보를 제3자에게 제공하지 않습니다. 서비스 운영을 위해 Google Cloud(서버·비밀값 보관),
        Gmail(가입 인증번호 메일 발송), Neon(데이터베이스), Vercel(웹 화면 제공)의 인프라를
        이용합니다.
      </p>
    ),
  },
  {
    title: '6. 문의',
    body: (
      <p>
        개인정보 관련 문의와 열람·정정·삭제 요청은{' '}
        <a href={`mailto:${CONTACT}`} className="underline underline-offset-4">
          {CONTACT}
        </a>
        로 보내 주세요.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="mx-auto flex max-w-2xl items-center px-4 py-4">
        <Link to="/" className="text-sm font-semibold">
          장학금 매칭
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-12">
        <article className="rounded-xl border bg-background p-5 text-sm leading-relaxed sm:p-6">
          <h1 className="text-xl font-semibold">개인정보처리방침</h1>
          <p className="mt-1 text-xs text-muted-foreground">시행일 {UPDATED_AT}</p>
          <div className="mt-6 grid gap-6">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 font-semibold">{section.title}</h2>
                <div className="text-muted-foreground">{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}
