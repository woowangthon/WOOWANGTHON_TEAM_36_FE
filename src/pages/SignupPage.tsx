// 이메일 가입 (계획서 7.1, 7.3): 이메일 → 메일로 받은 6자리 인증번호 확인 → 비밀번호.
// 인증번호를 확인하기 전에는 비밀번호 칸과 가입 버튼이 잠겨 있습니다. 로그인은 지금과 같습니다.
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'

import { useSignup, useSignupCode, useSignupVerify } from '@/api/hooks/auth'
import { ApiError } from '@/api/hooks/request'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton'
import { TargetNotice } from '@/components/auth/TargetNotice'
import { Field, FormError } from '@/components/form/Field'
import { PasswordInput } from '@/components/form/PasswordInput'
import { PasswordRules } from '@/components/form/PasswordRules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { newPasswordSchema } from '@/lib/password'

const emailSchema = z
  .string()
  .trim()
  .min(1, '이메일을 입력해 주세요')
  .email('이메일 형식이 아니에요')
  .max(320)
const CODE_PATTERN = /^[0-9]{6}$/

// backend SignupRequest와 같은 규칙: 8~16자, 영문·숫자·특수문자 (7.3, T38)
const schema = z
  .object({
    email: emailSchema,
    code: z.string(),
    password: newPasswordSchema,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요',
  })
type Values = z.infer<typeof schema>

/** 받은 인증번호의 상태. 시각은 Date.now() 기준 밀리초입니다. */
type Sent = { email: string; codeToken: string; expiresAt: number; resendAt: number }

/** 1초마다 바뀌는 현재 시각 (남은 시간·다시 받기 표시용). sync()로 바로 맞춥니다. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return [now, () => setNow(Date.now())] as const
}

function formatSeconds(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function SignupPage() {
  const navigate = useNavigate()
  const sendCode = useSignupCode()
  const verify = useSignupVerify()
  const signup = useSignup()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', code: '', password: '', passwordConfirm: '' },
  })
  const { errors } = form.formState
  const password = useWatch({ control: form.control, name: 'password' })

  const [sent, setSent] = useState<Sent | null>(null)
  const [signupToken, setSignupToken] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const verified = signupToken !== null
  const [now, syncNow] = useNow(sent !== null && !verified)
  const expired = sent !== null && now >= sent.expiresAt
  const canResend = sent !== null && now >= sent.resendAt

  const requestCode = async () => {
    setNotice(null)
    if (!(await form.trigger('email'))) return
    const email = form.getValues('email').trim()
    verify.reset()
    sendCode.mutate(
      { email },
      {
        onSuccess: (res) => {
          const at = Date.now()
          syncNow()
          setSent({
            email,
            codeToken: res.code_token,
            expiresAt: at + res.expires_in * 1000,
            resendAt: at + res.resend_after * 1000,
          })
          form.setValue('code', '')
          form.clearErrors('code')
        },
      },
    )
  }

  const checkCode = () => {
    if (!sent) return
    const code = form.getValues('code').trim()
    if (!CODE_PATTERN.test(code)) {
      verify.reset()
      form.setError('code', { message: '인증번호 6자리 숫자를 입력하세요' })
      return
    }
    form.clearErrors('code')
    verify.mutate(
      { code_token: sent.codeToken, code },
      { onSuccess: (res) => setSignupToken(res.signup_token) },
    )
  }

  /** 이메일을 다시 입력하거나 인증이 만료됐을 때 처음 단계로 돌아갑니다. */
  const restart = (message: string | null = null) => {
    setSent(null)
    setSignupToken(null)
    sendCode.reset()
    verify.reset()
    signup.reset()
    form.setValue('code', '')
    setNotice(message)
  }

  const onSubmit = form.handleSubmit(({ password }) => {
    if (!signupToken) return
    signup.mutate(
      { signup_token: signupToken, password },
      {
        onSuccess: () => navigate('/consent', { replace: true }),
        onError: (error) => {
          // 인증 후 30분이 지나면 signup_token이 만료됩니다 → 처음부터 다시
          if (error instanceof ApiError && error.status === 400) restart(error.message)
        },
      },
    )
  })

  const sendError = sendCode.error
  const alreadyRegistered = sendError instanceof ApiError && sendError.status === 409

  return (
    <AuthLayout
      title="회원가입"
      description="가입 후 동의와 프로필 입력을 거쳐 맞춤 목록을 봅니다."
    >
      <div className="grid gap-4">
        <TargetNotice />
        <GoogleButton next={null} />
        <OrDivider />
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field
            id="email"
            label="이메일"
            error={errors.email?.message}
            hint={verified ? '인증을 마친 이메일이에요' : undefined}
          >
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                readOnly={sent !== null}
                aria-invalid={!!errors.email}
                {...form.register('email')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (sent === null) void requestCode()
                  }
                }}
              />
              {sent === null ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={requestCode}
                  disabled={sendCode.isPending}
                >
                  {sendCode.isPending ? '보내는 중…' : '인증번호 받기'}
                </Button>
              ) : (
                !verified && (
                  <Button type="button" size="lg" variant="ghost" onClick={() => restart()}>
                    이메일 바꾸기
                  </Button>
                )
              )}
            </div>
          </Field>
          {alreadyRegistered ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              이미 가입된 이메일이에요.{' '}
              <Link to="/login" className="font-medium underline underline-offset-4">
                로그인
              </Link>
              해 주세요.
            </p>
          ) : (
            <FormError message={sendError?.message ?? notice} />
          )}

          {sent !== null && !verified && (
            <div className="grid gap-2">
              <Field
                id="code"
                label="인증번호"
                error={errors.code?.message}
                hint={`${sent.email}(으)로 보낸 6자리 숫자를 입력하세요`}
              >
                <div className="flex gap-2">
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    aria-invalid={!!errors.code}
                    {...form.register('code')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        checkCode()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    onClick={checkCode}
                    disabled={verify.isPending || expired}
                  >
                    확인
                  </Button>
                </div>
              </Field>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span aria-live="polite">
                  {expired
                    ? '인증번호가 만료됐어요'
                    : `남은 시간 ${formatSeconds(sent.expiresAt - now)}`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="link"
                  onClick={requestCode}
                  disabled={!canResend || sendCode.isPending}
                >
                  {canResend ? '다시 받기' : `다시 받기 (${formatSeconds(sent.resendAt - now)})`}
                </Button>
              </div>
              <FormError
                message={
                  expired ? '인증번호가 만료됐어요. 다시 받아 주세요' : verify.error?.message
                }
              />
              <p className="text-xs text-muted-foreground">
                메일이 안 오면 스팸함을 확인하세요. 1분 뒤 다시 받을 수 있어요.
              </p>
            </div>
          )}

          <Field
            id="password"
            label="비밀번호"
            error={errors.password?.message}
            hint={verified ? undefined : '이메일 인증을 마치면 입력할 수 있어요'}
          >
            <PasswordInput
              id="password"
              autoComplete="new-password"
              disabled={!verified}
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            {verified && <PasswordRules value={password} />}
          </Field>
          <Field id="passwordConfirm" label="비밀번호 확인" error={errors.passwordConfirm?.message}>
            <PasswordInput
              id="passwordConfirm"
              autoComplete="new-password"
              disabled={!verified}
              aria-invalid={!!errors.passwordConfirm}
              {...form.register('passwordConfirm')}
            />
          </Field>
          {verified && <FormError message={signup.error?.message} />}
          <Button type="submit" size="lg" disabled={!verified || signup.isPending}>
            {signup.isPending ? '가입 중…' : '가입하기'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          가입할 때 한 번만 메일로 인증번호를 확인합니다. 비밀번호를 잊으면 같은 이메일의 Google
          계정으로만 되찾을 수 있으니, Gmail 주소로 가입하는 것을 권합니다.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
            로그인
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
