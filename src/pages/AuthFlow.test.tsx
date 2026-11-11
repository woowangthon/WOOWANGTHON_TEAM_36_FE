// T24: 가입 → 동의 → 프로필 → 대시보드 흐름과 라우팅 가드 (MSW 목 API)
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { googleLoginUrl, safeNext } from '@/api/hooks/auth'
import {
  MOCK_PASSWORD,
  MOCK_SIGNUP_CODE,
  resetMockState,
  signOut,
  startLoggedOut,
} from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function select(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

/** 가입 1·2단계: 인증번호를 받고 확인합니다 (7.3, 목 번호 000000). */
async function verifyEmail(email: string, code = MOCK_SIGNUP_CODE) {
  type('이메일', email)
  fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
  await screen.findByLabelText('인증번호')
  type('인증번호', code)
  fireEvent.click(screen.getByRole('button', { name: '확인' }))
}

async function fillRequiredProfile() {
  type('닉네임', '김충북')
  select('성별', '여')
  select('출생연도', '2004')
  type('이수학기', '5')
  type('직전학기 평점', '3.8')
  type('직전학기 이수학점', '18')
  type('전체 평점평균', '3.6')
  fireEvent.click(screen.getByLabelText('아니오'))
}

describe('가입 흐름', () => {
  it('가입 → 동의 → 프로필 → 대시보드로 이동한다', async () => {
    startLoggedOut()
    let savedProfile: unknown = null
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && request.url.endsWith('/api/profile')) {
        savedProfile = await request.clone().json()
      }
    })
    const app = renderApp('/dashboard')

    // 비로그인 → 로그인 화면
    await screen.findByRole('heading', { name: '로그인' })
    expect(app.path()).toBe('/login')
    fireEvent.click(screen.getByRole('link', { name: '회원가입' }))

    // 가입
    await screen.findByRole('heading', { name: '회원가입' })
    await verifyEmail('new@example.com')
    await waitFor(() => expect(screen.getByLabelText('비밀번호')).toBeEnabled())
    type('비밀번호', 'password123')
    type('비밀번호 확인', 'password123')
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))

    // 동의: 필수 동의 전에는 버튼이 꺼져 있음
    await screen.findByRole('heading', { name: '개인정보 수집·이용 동의' })
    const next = screen.getByRole('button', { name: '동의하고 계속하기' })
    expect(next).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/\[필수\]/))
    fireEvent.click(next)

    // 프로필
    await screen.findByRole('heading', { name: '프로필 입력' })
    expect(app.path()).toBe('/profile')
    await fillRequiredProfile()
    select('본인 주소 시/도', '충청남도')
    select('본인 주소 시/군/구', '논산시')
    fireEvent.click(screen.getByLabelText('부모 주소가 본인 주소와 같음'))
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))

    await waitFor(() => expect(app.path()).toBe('/dashboard'))
    expect(savedProfile).toEqual({
      name: '김충북',
      gender: '여',
      birth_year: 2004,
      gpa: 3.8,
      credits: 18,
      gpa_total: 3.6,
      completed_semesters: 5,
      aibc_member: false,
      income_bracket: null,
      self_region: { sido: '충청남도', sigungu: '논산시' },
      parent_region: { sido: '충청남도', sigungu: '논산시' }, // 본인과 같음
      special_flags: null, // 민감정보 미동의
      full_tuition_waiver: null,
    })
    server.events.removeAllListeners()
  })

  it('인증번호를 확인하기 전에는 비밀번호 칸과 가입 버튼이 잠겨 있다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    expect(screen.getByLabelText('비밀번호')).toBeDisabled()
    expect(screen.getByLabelText('비밀번호 확인')).toBeDisabled()
    expect(screen.getByRole('button', { name: '가입하기' })).toBeDisabled()

    type('이메일', 'new@example.com')
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    await screen.findByLabelText('인증번호')
    expect(
      screen.getByText('메일이 안 오면 스팸함을 확인하세요. 1분 뒤 다시 받을 수 있어요.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/남은 시간 10:00|남은 시간 9:5\d/)).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeDisabled()

    type('인증번호', MOCK_SIGNUP_CODE)
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    await waitFor(() => expect(screen.getByLabelText('비밀번호')).toBeEnabled())
    expect(screen.getByLabelText('이메일')).toHaveAttribute('readonly')
    expect(screen.getByText('인증을 마친 이메일이에요')).toBeInTheDocument()
    expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument()
  })

  it('틀린 인증번호와 형식 오류를 알려 준다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    await verifyEmail('new@example.com', '123')
    expect(await screen.findByText('인증번호 6자리 숫자를 입력하세요')).toBeInTheDocument()

    type('인증번호', '123456')
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(await screen.findByText('인증번호가 맞지 않아요')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeDisabled()

    // 다시 형식 오류가 나면 이전 서버 오류는 지워 두 문구가 함께 보이지 않게 함
    type('인증번호', '12345')
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(await screen.findByText('인증번호 6자리 숫자를 입력하세요')).toBeInTheDocument()
    expect(screen.queryByText('인증번호가 맞지 않아요')).not.toBeInTheDocument()
  })

  it('이미 가입된 이메일이면 로그인으로 안내하고 번호 칸을 열지 않는다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    type('이메일', 'student@example.com')
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    const alert = await screen.findByText(/이미 가입된 이메일이에요/)
    expect(within(alert).getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
    expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument()
  })

  it('이메일 형식이 틀리면 인증번호를 보내지 않는다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    type('이메일', 'not-email')
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    expect(await screen.findByText('이메일 형식이 아니에요')).toBeInTheDocument()
    expect(screen.queryByLabelText('인증번호')).not.toBeInTheDocument()
  })

  it('이메일을 비우고 인증번호를 받으려 하면 입력하라고 알린다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
    expect(await screen.findByText('이메일을 입력해 주세요')).toBeInTheDocument()
    expect(screen.queryByText('이메일 형식이 아니에요')).not.toBeInTheDocument()
  })

  it('다시 받기는 1분 뒤에만 누를 수 있다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      startLoggedOut()
      renderApp('/signup')
      await screen.findByRole('heading', { name: '회원가입' })
      type('이메일', 'new@example.com')
      fireEvent.click(screen.getByRole('button', { name: '인증번호 받기' }))
      await screen.findByLabelText('인증번호')
      expect(screen.getByRole('button', { name: /다시 받기 \(/ })).toBeDisabled()

      await act(() => vi.advanceTimersByTimeAsync(61_000))
      const resend = screen.getByRole('button', { name: '다시 받기' })
      expect(resend).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('가입 비밀번호 규칙과 확인 불일치를 알려 준다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    await verifyEmail('new@example.com')
    await waitFor(() => expect(screen.getByLabelText('비밀번호')).toBeEnabled())
    type('비밀번호', 'short')
    type('비밀번호 확인', 'other')
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))
    expect(await screen.findByText('비밀번호는 8자 이상이어야 해요')).toBeInTheDocument()
    expect(screen.getByText('비밀번호가 서로 달라요')).toBeInTheDocument()
  })

  it('인증 시간이 지나 가입이 거부되면 처음 단계로 돌아간다', async () => {
    startLoggedOut()
    server.use(
      http.post('/api/auth/signup', () =>
        HttpResponse.json(
          { detail: '인증 시간이 지났어요. 이메일 인증을 다시 해 주세요' },
          { status: 400 },
        ),
      ),
    )
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    await verifyEmail('new@example.com')
    await waitFor(() => expect(screen.getByLabelText('비밀번호')).toBeEnabled())
    type('비밀번호', 'password123')
    type('비밀번호 확인', 'password123')
    fireEvent.click(screen.getByRole('button', { name: '가입하기' }))
    expect(
      await screen.findByText('인증 시간이 지났어요. 이메일 인증을 다시 해 주세요'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '인증번호 받기' })).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeDisabled()
  })
})

describe('로그인', () => {
  it('비밀번호가 틀리면 서버 메시지를 보여 준다', async () => {
    startLoggedOut()
    renderApp('/login')
    await screen.findByRole('heading', { name: '로그인' })
    type('이메일', 'student@example.com')
    type('비밀번호', 'wrong-password')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument()
  })

  it('로그인 후 원래 가려던 내부 경로로 돌아간다', async () => {
    signOut() // 프로필은 있는 사용자
    const app = renderApp('/login?next=%2Fprofile')
    await screen.findByRole('heading', { name: '로그인' })
    type('이메일', 'student@example.com')
    type('비밀번호', MOCK_PASSWORD)
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))
    await waitFor(() => expect(app.path()).toBe('/profile'))
  })

  it('Google 로그인 실패와 비밀번호 분실 안내를 보여 준다', async () => {
    startLoggedOut()
    renderApp('/login?error=google')
    expect(await screen.findByText(/Google 로그인에 실패했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument()
    expect(screen.getByText(/같은 이메일의 Google 계정으로 로그인하세요/)).toBeInTheDocument()
  })

  it('Google 로그인 주소에는 내부 경로만 붙인다', () => {
    expect(googleLoginUrl('/scholarships/3')).toBe(
      '/api/auth/google/login?next=%2Fscholarships%2F3',
    )
    expect(googleLoginUrl('//evil.com')).toBe('/api/auth/google/login')
    expect(googleLoginUrl('https://evil.com')).toBe('/api/auth/google/login')
    expect(safeNext('/\\evil.com')).toBeNull()
  })

  it('이미 로그인했으면 로그인 화면 대신 다음 단계로 보낸다', async () => {
    const app = renderApp('/login')
    await waitFor(() => expect(app.path()).toBe('/dashboard'))
  })
})

describe('라우팅 가드', () => {
  it('동의 전이면 프로필·대시보드 대신 동의 화면으로 보낸다', async () => {
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 1,
          email: 'g@gmail.com',
          privacy_agreed: false,
          sensitive_agreed: false,
          profile_completed: false,
          is_admin: false,
          google_linked: true,
          has_password: false,
        }),
      ),
    )
    const app = renderApp('/profile')
    await waitFor(() => expect(app.path()).toBe('/consent'))
  })

  it('프로필 미입력이면 대시보드 대신 프로필 화면으로 보낸다', async () => {
    startLoggedOut()
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 1,
          email: 'a@example.com',
          privacy_agreed: true,
          sensitive_agreed: false,
          profile_completed: false,
          is_admin: false,
          google_linked: false,
          has_password: true,
        }),
      ),
    )
    const app = renderApp('/dashboard')
    await waitFor(() => expect(app.path()).toBe('/profile'))
  })

  it('개인정보처리방침은 로그인 없이 볼 수 있다', async () => {
    startLoggedOut()
    const app = renderApp('/privacy')
    expect(await screen.findByRole('heading', { name: '개인정보처리방침' })).toBeInTheDocument()
    expect(app.path()).toBe('/privacy')
    expect(
      screen.getByText(/이메일 주소는 로그인과 가입 인증번호 발송에 사용합니다/),
    ).toBeInTheDocument()
  })
})

describe('프로필 화면', () => {
  it('수정 화면에서 이전 버튼으로 내 정보에 돌아간다', async () => {
    const app = renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    fireEvent.click(screen.getByRole('link', { name: '내 정보로' }))
    await waitFor(() => expect(app.path()).toBe('/my'))
  })

  it('고친 내용이 있으면 나가기 전에 묻는다', async () => {
    const app = renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    type('닉네임', '새닉네임')
    fireEvent.click(await screen.findByRole('button', { name: '내 정보로' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '나가기' }))
    await waitFor(() => expect(app.path()).toBe('/my'))
  })

  it('처음 입력하는 화면에는 이전 버튼이 없다', async () => {
    server.use(
      http.get('/api/profile', () =>
        HttpResponse.json({ detail: '프로필을 입력하세요' }, { status: 404 }),
      ),
    )
    renderApp('/profile')
    await screen.findByRole('heading', { name: '프로필 입력' })
    expect(screen.queryByText('내 정보로')).not.toBeInTheDocument()
  })

  it('필수 항목과 범위를 검증한다', async () => {
    server.use(
      http.get('/api/profile', () =>
        HttpResponse.json({ detail: '프로필을 입력하세요' }, { status: 404 }),
      ),
    )
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json({
          id: 1,
          email: 'a@example.com',
          privacy_agreed: true,
          sensitive_agreed: false,
          profile_completed: false,
          is_admin: false,
          google_linked: false,
          has_password: true,
        }),
      ),
    )
    renderApp('/profile')
    await screen.findByRole('heading', { name: '프로필 입력' })
    type('직전학기 평점', '4.6')
    type('직전학기 이수학점', '31')
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))
    expect(await screen.findByText('닉네임을 입력하세요')).toBeInTheDocument()
    expect(screen.getByText('0~4.5 사이로 입력하세요')).toBeInTheDocument()
    expect(screen.getByText('0~30 사이로 입력하세요')).toBeInTheDocument()
    expect(screen.getByText(/계절학기를 뺀 가장 최근/)).toBeInTheDocument()
    expect(screen.getByText('성별을 고르세요')).toBeInTheDocument()
    expect(screen.getByText('양성인재 여부를 고르세요')).toBeInTheDocument()
  })

  it('100점 환산 칸은 화면에 보이지 않는다 (서버가 평점으로 계산, T53)', async () => {
    renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(screen.getByLabelText('직전학기 평점')).toBeInTheDocument()
    expect(screen.queryByLabelText('직전학기 100점 환산')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('전체 100점 환산')).not.toBeInTheDocument()
  })

  it('저장된 프로필을 불러오고, 민감정보 미동의면 특수자격을 막는다', async () => {
    renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(screen.getByLabelText('닉네임')).toHaveValue('김충북')
    expect(screen.getByLabelText('본인 주소 시/군/구')).toHaveValue('청주시')
    expect(screen.getByLabelText('부모 주소 시/도')).toHaveValue('충청남도')
    expect(screen.queryByLabelText('보훈')).not.toBeInTheDocument()
    expect(screen.getByText(/따로 동의해야 입력할 수 있습니다/)).toBeInTheDocument()
  })

  it('이수학기가 0이면 성적 칸을 숨기고 성적 없이 저장한다', async () => {
    let saved: Record<string, unknown> | null = null
    server.events.on('request:start', async ({ request }) => {
      if (request.method === 'PUT' && request.url.endsWith('/api/profile')) {
        saved = await request.clone().json()
      }
    })
    const app = renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(screen.getByLabelText('직전학기 평점')).toHaveValue('3.8')
    type('이수학기', '0')
    await waitFor(() => expect(screen.queryByLabelText('직전학기 평점')).not.toBeInTheDocument())
    expect(screen.getByText(/아직 성적이 없어 입력하지 않아요/)).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('모름'))
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))

    await waitFor(() => expect(app.path()).toBe('/dashboard'))
    expect(saved).toMatchObject({
      completed_semesters: 0,
      aibc_member: null,
      gpa: null,
      credits: null,
      gpa_total: null,
    })
    server.events.removeAllListeners()
  })

  it('본인 주소 없이 "부모 주소가 본인 주소와 같음"을 고르면 막는다', async () => {
    renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    select('본인 주소 시/도', '')
    fireEvent.click(screen.getByLabelText('부모 주소가 본인 주소와 같음'))
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))
    expect(await screen.findByText('본인 주소를 먼저 입력하세요')).toBeInTheDocument()
  })

  it('닉네임이 지워진 기존 사용자에게 닉네임을 다시 받는다', async () => {
    server.use(
      http.get('/api/profile', () =>
        HttpResponse.json({
          name: null,
          gender: '여',
          birth_year: 2004,
          completed_semesters: 5,
          enrollment_status: '재학',
          aibc_member: false,
          gpa: 3.8,
        }),
      ),
    )
    renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(screen.getByText(/닉네임을 정하고 저장해 주세요/)).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))
    expect(await screen.findByText('닉네임을 입력하세요')).toBeInTheDocument()
  })

  it('서버가 거부한 칸은 그 칸 아래에 서버 문장을 보여 준다', async () => {
    server.use(
      http.put('/api/profile', () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'self_region'],
                msg: '목록에 있는 시/도를 고르세요',
                type: 'value_error',
              },
              {
                loc: ['body', 'name'],
                msg: '닉네임은 숫자만으로 만들 수 없어요',
                type: 'value_error',
              },
              { loc: ['body'], msg: '직전학기 평점을 입력하세요', type: 'value_error' },
            ],
          },
          { status: 422 },
        ),
      ),
    )
    const app = renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 장학금 보기' }))

    expect(await screen.findByText('목록에 있는 시/도를 고르세요')).toBeInTheDocument()
    expect(screen.getByText('닉네임은 숫자만으로 만들 수 없어요')).toBeInTheDocument()
    expect(screen.getByLabelText('닉네임')).toHaveAttribute('aria-invalid', 'true')
    // 칸을 알 수 없는 오류는 폼 아래 문장으로
    expect(screen.getByText('직전학기 평점을 입력하세요')).toBeInTheDocument()
    expect(screen.queryByText('입력값을 확인하세요')).not.toBeInTheDocument()
    expect(app.path()).toBe('/profile')
  })

  it('민감정보 동의 철회는 확인 후 진행한다', async () => {
    server.use(
      http.get(
        '/api/auth/me',
        () =>
          HttpResponse.json({
            id: 1,
            email: 'student@example.com',
            privacy_agreed: true,
            sensitive_agreed: true,
            profile_completed: true,
            is_admin: false,
            google_linked: false,
            has_password: true,
          }),
        { once: true },
      ),
    )
    let withdrawn = false
    server.use(
      http.delete('/api/auth/consent/sensitive', () => {
        withdrawn = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    expect(screen.getByLabelText('보훈')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '민감정보 동의 철회' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '철회' }))
    await waitFor(() => expect(withdrawn).toBe(true))
  })

  it('회원 탈퇴는 확인 후 로그인 화면으로 보낸다', async () => {
    const app = renderApp('/profile')
    await screen.findByRole('heading', { name: '내 프로필' })
    fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/되돌릴 수 없습니다/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '탈퇴' }))
    await waitFor(() => expect(app.path()).toBe('/login'))
    expect(await screen.findByText(/회원 탈퇴가 끝났어요/)).toBeInTheDocument()
  })
})

describe('대상 안내 (T42)', () => {
  it('로그인 화면에서 서비스 대상과 공지 수집 출처를 보여 준다', async () => {
    startLoggedOut()
    renderApp('/login')
    await screen.findByRole('heading', { name: '로그인' })
    expect(screen.getByText('충북대 소프트웨어학부 재학생을 위한 장학금 매칭')).toBeInTheDocument()
    const sources = screen.getByRole('list', { name: '공지 수집 출처' })
    expect(within(sources).getAllByRole('listitem')).toHaveLength(3)
  })

  it('회원가입 화면에도 같은 대상 안내를 보여 준다', async () => {
    startLoggedOut()
    renderApp('/signup')
    await screen.findByRole('heading', { name: '회원가입' })
    expect(screen.getByText('충북대 소프트웨어학부 재학생을 위한 장학금 매칭')).toBeInTheDocument()
  })
})
