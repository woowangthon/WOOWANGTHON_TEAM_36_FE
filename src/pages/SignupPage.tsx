import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'

import { useSignup } from '@/api/hooks/auth'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton'
import { Field, FormError } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// backend SignupRequest와 같은 규칙: 비밀번호 8~128자 (7.3)
const schema = z
  .object({
    email: z.string().trim().email('이메일 형식이 아닙니다').max(320),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다')
      .max(128, '비밀번호는 128자 이하여야 합니다'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 다릅니다',
  })
type Values = z.infer<typeof schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const signup = useSignup()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ email, password }) =>
    signup.mutate(
      { email, password },
      { onSuccess: () => navigate('/consent', { replace: true }) },
    ),
  )

  return (
    <AuthLayout
      title="회원가입"
      description="가입 후 동의와 프로필 입력을 거쳐 맞춤 목록을 봅니다."
    >
      <div className="grid gap-4">
        <GoogleButton next={null} />
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
          <Field id="password" label="비밀번호" error={errors.password?.message} hint="8자 이상">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
          </Field>
          <Field id="passwordConfirm" label="비밀번호 확인" error={errors.passwordConfirm?.message}>
            <Input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.passwordConfirm}
              {...form.register('passwordConfirm')}
            />
          </Field>
          <FormError message={signup.error?.message} />
          <Button type="submit" size="lg" disabled={signup.isPending}>
            {signup.isPending ? '가입 중…' : '가입하기'}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          메일 인증은 하지 않습니다. 비밀번호를 잊으면 같은 이메일의 Google 계정으로만 되찾을 수
          있으니, Gmail 주소로 가입하는 것을 권합니다.
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
