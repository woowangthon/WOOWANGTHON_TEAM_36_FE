// 시연 계정 시드 (T33, 계획서 10장 5단계)
// 판정 결과가 서로 다른 시연 프로필 4종을 만들거나 덮어씁니다. 웹 API만 씁니다(가입 → 동의 → 프로필 저장).
//
//   DEMO_PASSWORD='...' npm run seed:demo                      # 로컬 backend(http://localhost:8000)
//   DEMO_API_URL=https://cbnu-scholarship.vercel.app/api DEMO_PASSWORD='...' npm run seed:demo
//
// - 비밀번호는 환경변수로만 받고 출력하지 않습니다(8자 이상). 이미 있는 계정이면 로그인해서 프로필만 덮어씁니다.
// - 출력은 계정별 판정 개수뿐입니다. 프로필 값은 이 파일에 적힌 가상의 값입니다.

const API = (process.env.DEMO_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const PASSWORD = process.env.DEMO_PASSWORD
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('DEMO_PASSWORD 환경변수(8자 이상)를 넣어 주세요.')
  process.exit(1)
}

// 프로필 모양은 backend `ProfileUpdate`(2026-11-10 기준)를 따릅니다.
// - 이수학기(completed_semesters)로 학년을 계산하고, 재학상태는 보내지 않으면 재학입니다.
// - 이수학기 1 이상이면 직전학기 평점·이수학점·전체 평점평균이 필수입니다.
// - 100점 환산은 서버가 평점 × 10 + 52.5로 계산하므로 보내지 않습니다.
const base = {
  gender: '여',
  birth_year: 2004,
  credits: 18,
  income_bracket: null,
  self_region: null,
  parent_region: null,
  special_flags: null,
  full_tuition_waiver: null,
}

/** 판정이 서로 갈리도록 고른 가상 프로필 4종 */
const DEMOS = [
  {
    email: 'demo-a@cbnu-scholarship.test',
    note: '소프트웨어학부 3학년(5학기 마침) 재학, 평점·소득·주소 모두 입력',
    sensitive: false,
    profile: {
      ...base,
      name: '시연A',
      completed_semesters: 5,
      gpa: 4.1, // 100점 환산 93.5
      gpa_total: 3.95, // 92.0. 관정재단 "총 평점 4.0" 지원 불가 장면
      aibc_member: false,
      income_bracket: 2,
      self_region: { sido: '충청북도', sigungu: '청주시' },
      parent_region: { sido: '충청북도', sigungu: '청주시' },
      full_tuition_waiver: '아니오',
    },
  },
  {
    email: 'demo-b@cbnu-scholarship.test',
    note: '1학년(1학기 마침) 재학, 학년 환산 장면',
    sensitive: false,
    profile: {
      ...base,
      name: '시연B',
      gender: '남',
      birth_year: 2007,
      completed_semesters: 1,
      gpa: 3.2,
      gpa_total: 3.2, // 한 학기만 다녀 직전학기와 같음
      aibc_member: false,
      income_bracket: 6,
      self_region: { sido: '충청남도', sigungu: '논산시' },
      parent_region: { sido: '충청남도', sigungu: '논산시' },
      full_tuition_waiver: '아니오',
    },
  },
  {
    email: 'demo-c@cbnu-scholarship.test',
    note: '소프트웨어학부 2학년(3학기 마침) 재학·평점 2.3·소득 10구간, 평점·소득 조건 불충족',
    sensitive: false,
    profile: {
      ...base,
      name: '시연C',
      birth_year: 2005,
      completed_semesters: 3,
      gpa: 2.3, // 100점 환산 75.5
      credits: 12,
      gpa_total: 2.3,
      aibc_member: false,
      income_bracket: 10, // 11/9 결정: 휴학 대신 재학 + 소득 10구간
      self_region: { sido: '서울특별시', sigungu: null },
      parent_region: { sido: '서울특별시', sigungu: null },
      full_tuition_waiver: '아니오',
    },
  },
  {
    email: 'demo-d@cbnu-scholarship.test',
    note: 'AI부트캠프 양성인재 4학년(7학기 마침), 선택 정보 비움(확인 필요가 많음)',
    sensitive: true,
    profile: {
      ...base,
      name: '시연D',
      gender: '남',
      birth_year: 2002,
      completed_semesters: 7,
      gpa: 3.6, // 100점 환산 88.5
      gpa_total: 3.6,
      aibc_member: true,
    },
  },
]

/** 로그인 쿠키 하나만 들고 다니는 최소 클라이언트 */
function client() {
  let cookie = ''
  return async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    })
    for (const c of res.headers.getSetCookie()) {
      const pair = c.split(';')[0]
      if (pair.startsWith('access_token=')) cookie = pair // backend AUTH_COOKIE
    }
    return res
  }
}

async function expectOk(res, what) {
  if (res.ok) return
  const text = await res.text().catch(() => '')
  throw new Error(`${what} 실패: HTTP ${res.status} ${text.slice(0, 200)}`)
}

async function seed(demo) {
  const call = client()
  const credentials = { email: demo.email, password: PASSWORD }
  let res = await call('POST', '/auth/signup', credentials)
  if (res.status === 409) res = await call('POST', '/auth/login', credentials)
  await expectOk(res, `${demo.email} 가입·로그인`)

  await expectOk(
    await call('POST', '/auth/consent', { privacy: true, sensitive: demo.sensitive }),
    `${demo.email} 동의`,
  )
  await expectOk(await call('PUT', '/profile', demo.profile), `${demo.email} 프로필`)

  res = await call('GET', '/scholarships')
  await expectOk(res, `${demo.email} 목록`)
  const { items } = await res.json()
  const count = (r) => items.filter((i) => i.result === r).length
  console.log(
    `${demo.email}: 지원 가능 ${count('ELIGIBLE')} · 확인 필요 ${count('CONDITIONAL')} · 지원 불가 ${count('INELIGIBLE')}  (${demo.note})`,
  )
}

console.log(`대상: ${API}`)
for (const demo of DEMOS) await seed(demo)
