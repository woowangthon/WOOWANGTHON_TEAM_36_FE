import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { nextPathFor, useConsent, useMe } from '@/api/hooks/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { FormError } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/input'

// 개인정보(필수)와 민감정보(선택) 동의를 따로 받습니다(4.2). Google로 처음 들어온 사용자도 거칩니다.
export default function ConsentPage() {
  const me = useMe().data
  const navigate = useNavigate()
  const consent = useConsent()
  const [privacy, setPrivacy] = useState(me?.privacy_agreed ?? false)
  const [sensitive, setSensitive] = useState(me?.sensitive_agreed ?? false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    consent.mutate(
      { privacy, sensitive },
      { onSuccess: (updated) => navigate(nextPathFor(updated), { replace: true }) },
    )
  }

  return (
    <AuthLayout
      title="개인정보 수집·이용 동의"
      description="맞춤 장학금 판정에 필요한 정보만 받습니다."
    >
      <form onSubmit={submit} className="grid gap-4">
        <section className="rounded-lg border p-4">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5"
              aria-describedby="privacy-detail"
            />
            <span className="text-sm font-medium">[필수] 개인정보 수집·이용에 동의합니다</span>
          </label>
          <ul id="privacy-detail" className="mt-3 grid gap-1 pl-7 text-xs text-muted-foreground">
            <li>
              항목: 이메일, 닉네임, 성별, 출생연도, 성적(평점·이수학점, 100점 환산은 평점으로 자동
              계산), 이수학기, 소득분위, 주소(시/군/구까지)
            </li>
            <li>
              목적: 장학금 지원 조건과 비교해 맞춤 목록 제공. 이메일은 로그인, 가입 인증번호 발송과
              장학금 알림 메일(새 맞춤 장학금·관심 장학금 마감 안내) 발송에도 사용
            </li>
            <li>보관: 회원 탈퇴 시 즉시 삭제</li>
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={sensitive}
              onChange={(e) => setSensitive(e.target.checked)}
              className="mt-0.5"
              aria-describedby="sensitive-detail"
            />
            <span className="text-sm font-medium">[선택] 민감정보 수집·이용에 동의합니다</span>
          </label>
          <ul id="sensitive-detail" className="mt-3 grid gap-1 pl-7 text-xs text-muted-foreground">
            <li>항목: 특수자격(다자녀·보훈·장애)</li>
            <li>목적: 해당 자격 전용 장학금 판정</li>
            <li>
              동의하지 않아도 서비스를 쓸 수 있고, 특수자격 조건은 &lsquo;확인 필요&rsquo;로
              표시됩니다.
            </li>
            <li>프로필 화면에서 언제든 철회할 수 있으며, 철회하면 값을 즉시 삭제합니다.</li>
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">
          자세한 내용은{' '}
          <Link to="/privacy" target="_blank" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
          을 확인하세요. 입력한 정보는 AI에 보내지 않습니다.
        </p>
        <FormError message={consent.error?.message} />
        <Button type="submit" size="lg" disabled={!privacy || consent.isPending}>
          {consent.isPending ? '저장 중…' : '동의하고 계속하기'}
        </Button>
      </form>
    </AuthLayout>
  )
}
