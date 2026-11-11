import { expect, test } from '@playwright/test'

// 가입 → 동의 → 프로필 → 대시보드 → 상세 → 관심 표시 (T33, 계획서 10장 5단계)
// 실제 backend와 DB를 씁니다. DB에 마감 전·상시 장학금이 1개 이상 있어야 합니다.
// 테스트가 만든 계정은 마지막에 회원 탈퇴 API로 지웁니다.
// 가입 인증번호는 메일로 받을 수 없으므로 backend를 MAIL_MOCK=1(번호 000000)로 실행해야 합니다.

const SIGNUP_CODE = process.env.E2E_SIGNUP_CODE ?? '000000'

test('가입부터 관심 표시까지', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`
  const password = `e2e-${crypto.randomUUID()}`

  try {
    // 가입
    await page.goto('/signup')
    await page.getByLabel('이메일').fill(email)
    await page.getByRole('button', { name: '인증번호 받기' }).click()
    await page.getByLabel('인증번호').fill(SIGNUP_CODE)
    await page.getByRole('button', { name: '확인' }).click()
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeEnabled()
    await page.getByLabel('비밀번호', { exact: true }).fill(password)
    await page.getByLabel('비밀번호 확인').fill(password)
    await page.getByRole('button', { name: '가입하기' }).click()

    // 동의 (필수만)
    await expect(page).toHaveURL(/\/consent$/)
    const submitConsent = page.getByRole('button', { name: '동의하고 계속하기' })
    await expect(submitConsent).toBeDisabled()
    await page.getByLabel('[필수] 개인정보 수집·이용에 동의합니다').check()
    await submitConsent.click()

    // 프로필 (필수 항목만)
    await expect(page).toHaveURL(/\/profile$/)
    await page.getByLabel('닉네임').fill('E2E학생')
    await page.getByLabel('성별').selectOption('여')
    await page.getByLabel('출생연도').selectOption('2004')
    await page.getByLabel('이수학기').fill('5')
    await page.getByLabel('직전학기 평점').fill('3.8')
    await page.getByLabel('직전학기 이수학점').fill('18')
    await page.getByLabel('전체 평점평균').fill('3.6')
    await page.getByLabel('아니오').check()
    await page.getByRole('button', { name: '저장하고 장학금 보기' }).click()

    // 대시보드
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: '맞춤 장학금' })).toBeVisible()
    const firstCard = page.locator('a[href^="/scholarships/"]').first()
    await expect(firstCard).toBeVisible()
    const name = (await firstCard.locator('h3').textContent())?.trim() ?? ''

    // 상세
    await firstCard.click()
    await expect(page).toHaveURL(/\/scholarships\/\d+$/)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByRole('list', { name: '조건 체크리스트' })).toBeVisible()

    // 관심 표시 → 새로고침해도 유지
    await page.getByRole('button', { name: '관심', exact: true }).click()
    const unbookmark = page.getByRole('button', { name: '관심 해제' })
    await expect(unbookmark).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.getByRole('button', { name: '관심 해제' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  } finally {
    // 회원 탈퇴로 테스트 계정 삭제 (로그인 쿠키를 같이 씀)
    const res = await page.request.delete('/api/auth/me')
    expect([204, 401]).toContain(res.status())
  }
})
