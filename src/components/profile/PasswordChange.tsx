// 내 정보 화면의 비밀번호 변경 (계획서 7.3, T38). 프로필 폼과 다른 별도 <form>입니다.
// 바꾸면 backend가 다른 기기의 로그인을 끊고 이 기기에는 새 쿠키를 줍니다.
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { useChangePassword, type Me } from '@/api/hooks/auth'
import { ApiError } from '@/api/hooks/request'
import { Field, FormError } from '@/components/form/Field'
import { PasswordInput } from '@/components/form/PasswordInput'
import { PasswordRules } from '@/components/form/PasswordRules'
import { Button } from '@/components/ui/button'
import { newPasswordSchema } from '@/lib/password'

const WRONG_CURRENT = '현재 비밀번호가 맞지 않아요'

const schema = z
  .object({
    current: z.string().min(1, '현재 비밀번호를 입력하세요'),
    next: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: '비밀번호가 서로 달라요' })
type Values = z.infer<typeof schema>

export function PasswordChange({ me }: { me: Me }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)

  // 계정 상자의 한 줄: 왼쪽에 이름과 설명, 오른쪽에 변경 버튼. 누르면 줄 아래에 폼이 펼쳐집니다.
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">비밀번호</p>
          <p className="mt-0.5 text-[13px] break-keep text-muted-foreground">
            {me.has_password
              ? '바꾸면 다른 기기에서는 다시 로그인해야 해요'
              : 'Google 계정으로 로그인하는 계정이에요'}
          </p>
        </div>
        {me.has_password && !open && (
          <Button
            variant="outline"
            size="sm"
            aria-label="비밀번호 변경"
            className="shrink-0"
            onClick={() => {
              setDone(false)
              setOpen(true)
            }}
          >
            변경
          </Button>
        )}
      </div>
      {done && (
        <p role="status" className="rounded-xl bg-muted px-3.5 py-2.5 text-sm break-keep">
          비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요
        </p>
      )}
      {open && (
        <PasswordChangeForm
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false)
            setDone(true)
          }}
        />
      )}
    </div>
  )
}

function PasswordChangeForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const change = useChangePassword()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current: '', next: '', confirm: '' },
  })
  const { errors } = form.formState
  const next = useWatch({ control: form.control, name: 'next' })

  const onSubmit = form.handleSubmit(({ current, next }) =>
    change.mutate(
      { current_password: current, new_password: next },
      {
        onSuccess: onDone,
        onError: (error) => {
          if (error instanceof ApiError && error.message === WRONG_CURRENT) {
            form.setError(
              'current',
              { type: 'server', message: WRONG_CURRENT },
              { shouldFocus: true },
            )
          }
        },
      },
    ),
  )
  // 현재 비밀번호 칸에 붙인 오류는 아래에 다시 보여 주지 않습니다.
  const serverMessage = change.error?.message === WRONG_CURRENT ? null : change.error?.message

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-xl border border-border bg-canvas/60 p-4"
      noValidate
    >
      <Field id="current_password" label="현재 비밀번호" error={errors.current?.message}>
        <PasswordInput
          id="current_password"
          autoComplete="current-password"
          aria-invalid={!!errors.current}
          {...form.register('current')}
        />
      </Field>
      <Field id="new_password" label="새 비밀번호" error={errors.next?.message}>
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          aria-invalid={!!errors.next}
          {...form.register('next')}
        />
        <PasswordRules value={next} />
      </Field>
      <Field id="new_password_confirm" label="새 비밀번호 확인" error={errors.confirm?.message}>
        <PasswordInput
          id="new_password_confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          {...form.register('confirm')}
        />
      </Field>
      <FormError message={serverMessage} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={change.isPending}>
          {change.isPending ? '바꾸는 중…' : '비밀번호 바꾸기'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  )
}
