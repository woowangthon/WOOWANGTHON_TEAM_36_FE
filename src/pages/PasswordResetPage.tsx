// 비밀번호 찾기 (계획서 7.3): 이메일 → 메일로 받은 6자리 인증번호 확인 → 새 비밀번호.
// 번호를 확인해야 새 비밀번호 칸이 나타납니다. 저장하면 다른 기기는 로그아웃되고 이 기기는 로그인됩니다.
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'

import { usePasswordReset, usePasswordResetCode, usePasswordResetVerify } from '@/api/hooks/auth'
import { ApiError } from '@/api/hooks/request'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Field, FormError } from '@/components/form/Field'
import { PasswordInput } from '@/components/form/PasswordInput'
import { PasswordRules } from '@/components/form/PasswordRules'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatSeconds, useNow } from '@/lib/countdown'
import { newPasswordSchema } from '@/lib/password'

const CODE_PATTERN = /^[0-9]{6}$/

const schema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, '이메일을 입력해 주세요')
      .email('이메일 형식이 아니에요')
      .max(320),
    code: z.string(),
    password: newPasswordSchema,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요',
  })
type Values = z.infer<typeof schema>

type Sent = { email: string; codeToken: string; expiresAt: number; resendAt: number }

export default function PasswordResetPage() {
  const navigate = useNavigate()
  const sendCode = usePasswordResetCode()
  const verify = usePasswordResetVerify()
  const reset = usePasswordReset()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', code: '', password: '', passwordConfirm: '' },
  })
  const { errors } = form.formState
  const password = useWatch({ control: form.control, name: 'password' })

  const [sent, setSent] = useState<Sent | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const verified = resetToken !== null
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
      { onSuccess: (res) => setResetToken(res.reset_token) },
    )
  }

  const restart = (message: string | null = null) => {
    setSent(null)
    setResetToken(null)
    sendCode.reset()
    verify.reset()
    reset.reset()
    form.setValue('code', '')
    setNotice(message)
  }

  const onSubmit = form.handleSubmit(({ password }) => {
    if (!resetToken) return
    reset.mutate(
      { reset_token: resetToken, new_password: password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) => {
          // 확인 후 30분이 지나면 reset_token이 만료됩니다 → 처음부터 다시
          if (error instanceof ApiError && error.status === 400) restart(error.message)
        },
      },
    )
  })

  const sendError = sendCode.error
  const notSignedUp = sendError instanceof ApiError && sendError.status === 404

  return (
    <AuthLayout
      title="비밀번호 찾기"
      description="가입한 이메일로 인증번호를 받아 새 비밀번호를 정합니다."
    >
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
                variant="outline"
                className="h-11"
                onClick={requestCode}
                disabled={sendCode.isPending}
              >
                {sendCode.isPending ? '보내는 중…' : '인증번호 받기'}
              </Button>
            ) : (
              !verified && (
                <Button type="button" variant="ghost" className="h-11" onClick={() => restart()}>
                  이메일 바꾸기
                </Button>
              )
            )}
          </div>
        </Field>
        {notSignedUp ? (
          <p
            role="alert"
            className="rounded-xl bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
          >
            가입되지 않은 이메일입니다.{' '}
            <Link to="/signup" className="font-semibold underline underline-offset-4">
              회원가입
            </Link>
            을 해 주세요.
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
                  variant="outline"
                  className="h-11"
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
              message={expired ? '인증번호가 만료됐어요. 다시 받아 주세요' : verify.error?.message}
            />
            <p className="text-xs text-muted-foreground">
              메일이 안 오면 스팸함을 확인하세요. 1분 뒤 다시 받을 수 있어요.
            </p>
          </div>
        )}

        {verified && (
          <>
            <Field id="password" label="새 비밀번호" error={errors.password?.message}>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register('password')}
              />
              <PasswordRules value={password} />
            </Field>
            <Field
              id="passwordConfirm"
              label="새 비밀번호 확인"
              error={errors.passwordConfirm?.message}
            >
              <PasswordInput
                id="passwordConfirm"
                autoComplete="new-password"
                aria-invalid={!!errors.passwordConfirm}
                {...form.register('passwordConfirm')}
              />
            </Field>
            <FormError message={reset.error?.message} />
            <p className="text-xs text-muted-foreground">
              바꾸면 다른 기기에서는 다시 로그인해야 해요.
            </p>
            <Button type="submit" size="lg" disabled={reset.isPending}>
              {reset.isPending ? '저장 중…' : '새 비밀번호 저장'}
            </Button>
          </>
        )}
      </form>
      <p className="mt-4 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        비밀번호가 생각났나요?{' '}
        <Link to="/login" className="font-semibold text-foreground underline underline-offset-4">
          로그인
        </Link>
      </p>
    </AuthLayout>
  )
}
