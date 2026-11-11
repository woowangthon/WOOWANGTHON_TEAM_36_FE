import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { nextPathFor, safeNext, useLogin } from '@/api/hooks/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton'
import { TargetNotice } from '@/components/auth/TargetNotice'
import { Field, FormError } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().trim().email('이메일 형식이 아닙니다'),
  password: z.string().min(1, '비밀번호를 입력하세요'),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const navigate = useNavigate()
  const login = useLogin()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (me) => {
        const target = nextPathFor(me)
        navigate(target === '/dashboard' && next ? next : target, { replace: true })
      },
    }),
  )
  const googleFailed = params.get('error') === 'google'
  const withdrawn = params.get('withdrawn') === '1'

  return (
    <AuthLayout title="로그인" description="내 조건에 맞는 장학금을 한 화면에서 확인하세요.">
      <div className="grid gap-4">
        {withdrawn && (
          <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
            회원 탈퇴가 끝났어요. 계정과 입력한 정보를 모두 지웠어요.
          </p>
        )}
        <TargetNotice />
        {googleFailed && (
          <FormError message="Google 로그인에 실패했습니다. 다시 시도하거나 이메일로 로그인하세요." />
        )}
        <GoogleButton next={next} />
        <OrDivider />
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <Field id="email" label="이메일" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...form.register('email')}
            />
          </Field>
          <Field id="password" label="비밀번호" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
          </Field>
          <FormError message={login.error?.message} />
          <Button type="submit" size="lg" disabled={login.isPending}>
            {login.isPending ? '로그인 중…' : '로그인'}
          </Button>
        </form>
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          비밀번호를 잊었다면 같은 이메일의 Google 계정으로 로그인하세요. 이후에는 Google
          로그인으로만 들어올 수 있습니다.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          처음이신가요?{' '}
          <Link to="/signup" className="font-medium text-foreground underline underline-offset-4">
            회원가입
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
