import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { useDeleteAccount, useLogout, useMe, useWithdrawSensitive, type Me } from '@/api/hooks/auth'
import { useProfile, useSaveProfile, type Profile } from '@/api/hooks/profile'
import { AuthLayout, PageSkeleton } from '@/components/auth/AuthLayout'
import { Field, FormError } from '@/components/form/Field'
import {
  ENROLLMENT_STATUSES,
  INCOME_OPTIONS,
  optionalNumberInput,
  profileSchema,
  SPECIAL_FLAGS,
  toFormValues,
  toProfile,
  type ProfileFormInput,
  type ProfileFormValues,
} from '@/components/profile/profileForm'
import { RegionSelect } from '@/components/profile/RegionSelect'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Checkbox, Input, NativeSelect } from '@/components/ui/input'

// 프로필 입력·수정 (계획서 4.1). 첫 로그인 때 필수이고, 민감정보 동의 철회·회원 탈퇴도 여기서 합니다(4.2).
export default function ProfilePage() {
  const me = useMe().data
  const profile = useProfile()
  if (!me || profile.isPending) return <PageSkeleton />
  return (
    <AuthLayout
      wide
      title={profile.data ? '내 프로필' : '프로필 입력'}
      description="입력한 정보로 지원 가능한 장학금을 판정합니다. AI에는 보내지 않습니다."
    >
      {profile.isError ? (
        <FormError message={profile.error.message} />
      ) : (
        <ProfileForm me={me} initial={profile.data} />
      )}
      <AccountActions me={me} />
    </AuthLayout>
  )
}

function ProfileForm({ me, initial }: { me: Me; initial: Profile | null }) {
  const navigate = useNavigate()
  const save = useSaveProfile()
  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(initial),
  })
  const { register, formState, control } = form
  const { errors } = formState
  const parentSame = useWatch({ control, name: 'parent_same' })

  const onSubmit = form.handleSubmit((values) =>
    save.mutate(toProfile(values, me.sensitive_agreed), {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    }),
  )
  const number = { valueAsNumber: true } as const

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="grid gap-6" noValidate>
        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">기본 정보</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="이름" error={errors.name?.message} hint="화면 표시에만 씁니다">
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
            </Field>
            <Field id="gender" label="성별" error={errors.gender?.message}>
              <NativeSelect id="gender" aria-invalid={!!errors.gender} {...register('gender')}>
                <option value="">선택</option>
                <option value="남">남</option>
                <option value="여">여</option>
              </NativeSelect>
            </Field>
            <Field
              id="birth_year"
              label="출생연도"
              error={errors.birth_year?.message}
              hint="나이는 자동으로 계산합니다"
            >
              <Input
                id="birth_year"
                type="number"
                inputMode="numeric"
                placeholder="2004"
                aria-invalid={!!errors.birth_year}
                {...register('birth_year', number)}
              />
            </Field>
            <Field id="department" label="소속 학과" error={errors.department?.message}>
              <NativeSelect
                id="department"
                aria-invalid={!!errors.department}
                {...register('department')}
              >
                <option value="">선택</option>
                <option value="소프트웨어학부">소프트웨어학부</option>
                <option value="기타">기타</option>
              </NativeSelect>
            </Field>
            <Field id="grade" label="학년" error={errors.grade?.message}>
              <NativeSelect id="grade" aria-invalid={!!errors.grade} {...register('grade')}>
                <option value="">선택</option>
                {['1', '2', '3', '4'].map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </NativeSelect>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <Checkbox {...register('extra_semester')} />
                초과학기
              </label>
            </Field>
            <Field
              id="enrollment_status"
              label="재학상태"
              error={errors.enrollment_status?.message}
            >
              <NativeSelect
                id="enrollment_status"
                aria-invalid={!!errors.enrollment_status}
                {...register('enrollment_status')}
              >
                <option value="">선택</option>
                {ENROLLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">AI부트캠프사업단 양성인재인가요?</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="yes"
                  className="accent-primary"
                  {...register('aibc_member')}
                />
                예
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="no"
                  className="accent-primary"
                  {...register('aibc_member')}
                />
                아니오
              </label>
            </div>
            {errors.aibc_member && (
              <p role="alert" className="text-xs text-destructive">
                {errors.aibc_member.message}
              </p>
            )}
          </fieldset>
        </section>

        <section className="grid gap-4" aria-labelledby="grades-heading">
          <div className="grid gap-1">
            <h2 id="grades-heading" className="text-sm font-semibold">
              성적
            </h2>
            <p className="text-muted-foreground text-xs">
              포털 성적 조회의 숫자를 그대로 적어 주세요. 직전학기 = 계절학기를 뺀 가장 최근
              정규학기(1·2학기)입니다. 비워 둔 칸이 필요한 장학금은 &lsquo;확인 필요&rsquo;로
              보여요.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="gpa"
              label="직전학기 평점"
              error={errors.gpa?.message}
              hint="4.5 만점 · 학기별 성적의 평점평균"
            >
              <Input
                id="gpa"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="3.75"
                aria-invalid={!!errors.gpa}
                {...register('gpa', number)}
              />
            </Field>
            <Field
              id="score_100"
              label="직전학기 100점 환산 (선택)"
              error={errors.score_100?.message}
              hint="같은 학기의 실점평균"
            >
              <Input
                id="score_100"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="88.5"
                aria-invalid={!!errors.score_100}
                {...register('score_100', optionalNumberInput)}
              />
            </Field>
            <Field
              id="credits"
              label="직전학기 이수학점 (선택)"
              error={errors.credits?.message}
              hint="같은 학기의 신청학점"
            >
              <Input
                id="credits"
                type="number"
                inputMode="numeric"
                placeholder="18"
                aria-invalid={!!errors.credits}
                {...register('credits', optionalNumberInput)}
              />
            </Field>
            <Field
              id="gpa_total"
              label="전체 평점평균 (선택)"
              error={errors.gpa_total?.message}
              hint="4.5 만점 · 성적 내역의 평점평균"
            >
              <Input
                id="gpa_total"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="3.60"
                aria-invalid={!!errors.gpa_total}
                {...register('gpa_total', optionalNumberInput)}
              />
            </Field>
            <Field
              id="score_100_total"
              label="전체 100점 환산 (선택)"
              error={errors.score_100_total?.message}
              hint="성적 내역의 100점환산"
            >
              <Input
                id="score_100_total"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="87.2"
                aria-invalid={!!errors.score_100_total}
                {...register('score_100_total', optionalNumberInput)}
              />
            </Field>
          </div>
        </section>

        <section className="grid gap-4 border-t pt-5">
          <div>
            <h2 className="text-sm font-semibold">선택 정보</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              입력하면 더 정확해져요. 비워 두면 해당 조건은 &lsquo;확인 필요&rsquo;로 표시됩니다.
              소득분위·주소·특수자격은 암호화해 저장합니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="income_bracket" label="소득분위" optional>
              <NativeSelect id="income_bracket" {...register('income_bracket')}>
                {INCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="full_tuition_waiver" label="등록금 전액 감면" optional>
              <NativeSelect id="full_tuition_waiver" {...register('full_tuition_waiver')}>
                <option value="">입력 안 함</option>
                <option value="예">예</option>
                <option value="아니오">아니오</option>
                <option value="모름">모름</option>
              </NativeSelect>
            </Field>
          </div>
          <RegionSelect prefix="self" label="본인 주소" error={errors.self_sido?.message} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('parent_same')} />
            부모 주소가 본인 주소와 같음
          </label>
          {!parentSame && <RegionSelect prefix="parent" label="부모 주소" />}

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">
              특수자격<span className="ml-1 font-normal text-muted-foreground">(선택)</span>
            </legend>
            {me.sensitive_agreed ? (
              <div className="flex flex-wrap gap-4 text-sm">
                {SPECIAL_FLAGS.map((flag) => (
                  <label key={flag} className="flex items-center gap-2">
                    <Checkbox value={flag} {...register('special_flags')} />
                    {flag}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                장애·보훈은 민감정보라 따로 동의해야 입력할 수 있습니다.{' '}
                <Link to="/consent" className="underline underline-offset-4">
                  동의 화면으로
                </Link>
              </p>
            )}
          </fieldset>
        </section>

        <FormError message={save.error?.message} />
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : '저장하고 장학금 보기'}
        </Button>
      </form>
    </FormProvider>
  )
}

function AccountActions({ me }: { me: Me }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const withdraw = useWithdrawSensitive()
  const deleteAccount = useDeleteAccount()
  const toLogin = () => navigate('/login', { replace: true })

  return (
    <section className="mt-8 grid gap-3 border-t pt-5">
      <h2 className="text-sm font-semibold">계정</h2>
      <p className="text-xs text-muted-foreground">{me.email}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => logout.mutate(undefined, { onSuccess: toLogin })}>
          로그아웃
        </Button>
        {me.sensitive_agreed && (
          <ConfirmDialog
            trigger={<Button variant="outline">민감정보 동의 철회</Button>}
            title="민감정보 동의를 철회할까요?"
            description="입력한 특수자격(다자녀·보훈·장애)을 즉시 삭제합니다. 다시 동의하면 새로 입력할 수 있습니다."
            confirmLabel="철회"
            pending={withdraw.isPending}
            onConfirm={() => withdraw.mutate()}
          />
        )}
        <ConfirmDialog
          trigger={<Button variant="destructive">회원 탈퇴</Button>}
          title="정말 탈퇴할까요?"
          description="계정·프로필·관심/신청완료 기록을 즉시 삭제하며 되돌릴 수 없습니다."
          confirmLabel="탈퇴"
          pending={deleteAccount.isPending}
          onConfirm={() => deleteAccount.mutate(undefined, { onSuccess: toLogin })}
        />
      </div>
      <FormError message={withdraw.error?.message ?? deleteAccount.error?.message} />
    </section>
  )
}
