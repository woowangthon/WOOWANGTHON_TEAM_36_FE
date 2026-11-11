import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'

import { useDeleteAccount, useMe, useWithdrawSensitive, type Me } from '@/api/hooks/auth'
import { useProfile, useSaveProfile, type Profile } from '@/api/hooks/profile'
import { ApiError } from '@/api/hooks/request'
import { AuthLayout, PageSkeleton } from '@/components/auth/AuthLayout'
import { Field, FormError } from '@/components/form/Field'
import {
  birthYearOptions,
  formFieldOf,
  GRADE_FIELDS,
  hasNoGrades,
  INCOME_OPTIONS,
  MAX_SEMESTERS,
  profileSchema,
  score100FromGpa,
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
  const [dirty, setDirty] = useState(false)
  if (!me || profile.isPending) return <PageSkeleton />
  return (
    <AuthLayout
      wide
      title={profile.data ? '내 프로필' : '프로필 입력'}
      description="입력한 정보로 지원 가능한 장학금을 판정합니다. AI에는 보내지 않습니다."
      back={profile.data ? <BackToList dirty={dirty} /> : undefined}
    >
      {profile.isError ? (
        <FormError message={profile.error.message} />
      ) : (
        <ProfileForm me={me} initial={profile.data} onDirtyChange={setDirty} />
      )}
      <AccountActions me={me} />
    </AuthLayout>
  )
}

// 수정 화면에서만 보이는 이전 버튼(T49 → T52에서 '내 정보'로). 고친 내용이 있으면 나가기 전에 한 번 묻습니다.
function BackToList({ dirty }: { dirty: boolean }) {
  const navigate = useNavigate()
  const className =
    'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-800'
  const label = (
    <>
      <ArrowLeft className="size-4" aria-hidden="true" />내 정보로
    </>
  )
  if (!dirty) {
    return (
      <Link to="/my" className={className}>
        {label}
      </Link>
    )
  }
  return (
    <ConfirmDialog
      trigger={
        <button type="button" className={className}>
          {label}
        </button>
      }
      title="저장하지 않고 나갈까요?"
      description="고친 내용은 저장되지 않습니다."
      confirmLabel="나가기"
      onConfirm={() => navigate('/my')}
    />
  )
}

function ProfileForm({
  me,
  initial,
  onDirtyChange,
}: {
  me: Me
  initial: Profile | null
  onDirtyChange: (dirty: boolean) => void
}) {
  const navigate = useNavigate()
  const save = useSaveProfile()
  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(initial),
  })
  const { register, formState, control, setValue } = form
  const { errors, isDirty } = formState
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])
  const parentSame = useWatch({ control, name: 'parent_same' })
  const noGrades = hasNoGrades(useWatch({ control, name: 'completed_semesters' }))
  const gpa = useWatch({ control, name: 'gpa' })
  const gpaTotal = useWatch({ control, name: 'gpa_total' })

  // 이수학기 0이면 성적 칸을 숨기고, 적어 둔 값도 비웁니다(다시 1 이상으로 바꿔도 옛 값이 되살아나지 않게).
  useEffect(() => {
    if (noGrades) GRADE_FIELDS.forEach((name) => setValue(name, ''))
  }, [noGrades, setValue])

  // 칸에 붙이지 못한 서버 오류 문장. 없으면 서버의 대표 문장(save.error)을 씁니다.
  const [serverMessage, setServerMessage] = useState<string | null>(null)

  const onSubmit = form.handleSubmit((values) => {
    setServerMessage(null)
    save.mutate(toProfile(values, me.sensitive_agreed), {
      onSuccess: () => navigate('/dashboard', { replace: true }),
      // 화면 검사를 거치지 않은 값(옛 화면, 목록 밖 주소 등)을 서버가 거부하면 그 칸 아래에 보여 줍니다(정의서 18-2).
      onError: (error) => {
        if (!(error instanceof ApiError)) return
        const rest: string[] = []
        for (const { path, message } of error.fieldErrors) {
          const field = formFieldOf(path)
          if (field) form.setError(field, { type: 'server', message }, { shouldFocus: true })
          else rest.push(message)
        }
        if (rest.length) setServerMessage(rest.join(' · '))
        else if (error.fieldErrors.length) setServerMessage('표시된 칸을 확인하세요')
      },
    })
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="grid gap-6" noValidate>
        {initial && initial.name == null && (
          <p role="status" className="rounded-md border bg-muted px-3 py-2 text-sm">
            이름 대신 닉네임을 쓰도록 바뀌었어요. 닉네임을 정하고 저장해 주세요.
          </p>
        )}
        <section className="grid gap-4">
          <h2 className="text-sm font-semibold">기본 정보</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="name"
              label="닉네임"
              error={errors.name?.message}
              hint="서비스에서 부를 이름이에요. 실명이 아니어도 돼요"
            >
              <Input
                id="name"
                autoComplete="nickname"
                maxLength={20}
                placeholder="한글·영문·숫자 2~10자"
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
              <NativeSelect
                id="birth_year"
                aria-invalid={!!errors.birth_year}
                {...register('birth_year')}
              >
                <option value="">선택</option>
                {birthYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {/* 오류가 입력 바로 아래에 오도록, 긴 안내문은 Field 밖에 둡니다. */}
            <div className="grid content-start gap-1.5">
              <Field
                id="completed_semesters"
                label="이수학기"
                error={errors.completed_semesters?.message}
              >
                <Input
                  id="completed_semesters"
                  inputMode="numeric"
                  placeholder={`0~${MAX_SEMESTERS}`}
                  aria-invalid={!!errors.completed_semesters}
                  aria-describedby="completed_semesters-help"
                  {...register('completed_semesters')}
                />
              </Field>
              <p id="completed_semesters-help" className="text-xs text-muted-foreground">
                마친 정규학기 수예요. 휴학·계절학기는 빼고 세요. 신입생 첫 학기는 0. 학기가 끝나
                성적이 나오면 이수학기와 성적을 함께 고쳐 주세요(성적이 나오기 전이면 그 전 값
                그대로).
              </p>
            </div>
          </div>
          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">AI부트캠프사업단 양성인재인가요?</legend>
            <p className="mb-1.5 text-xs text-muted-foreground">
              충북대 AI부트캠프사업단 교육과정에 참여 중인 학생이에요. 사업단 장학금은 양성인재만
              지원할 수 있어요.{' '}
              <a
                href="https://aibc.cbnu.ac.kr/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                사업단 누리집
              </a>
            </p>
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
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="unknown"
                  className="accent-primary"
                  {...register('aibc_member')}
                />
                모름
              </label>
            </div>
            {errors.aibc_member && (
              <p role="alert" className="text-xs text-destructive">
                {errors.aibc_member.message}
              </p>
            )}
          </fieldset>
        </section>

        {noGrades ? (
          <section className="grid gap-1" aria-labelledby="grades-heading">
            <h2 id="grades-heading" className="text-sm font-semibold">
              성적
            </h2>
            <p className="text-xs text-muted-foreground">
              이수학기가 0이면 아직 성적이 없어 입력하지 않아요. 성적 조건이 있는 장학금은
              &lsquo;확인 필요&rsquo;로 보이니, 신입생 성적 기준은 공지 원문을 확인하세요.
            </p>
          </section>
        ) : (
          <section className="grid gap-4" aria-labelledby="grades-heading">
            <div className="grid gap-1">
              <h2 id="grades-heading" className="text-sm font-semibold">
                성적
              </h2>
              <p className="text-muted-foreground text-xs">
                포털 성적 조회의 숫자를 그대로 적어 주세요. 직전학기 = 계절학기를 뺀 가장 최근
                정규학기(1·2학기)이고, 휴학했다면 휴학 전 마지막 학기입니다.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="gpa"
                label="직전학기 평점"
                error={errors.gpa?.message}
                hint="4.5 만점 · 소수 둘째 자리까지"
              >
                <Input
                  id="gpa"
                  inputMode="decimal"
                  placeholder="3.75"
                  aria-invalid={!!errors.gpa}
                  {...register('gpa')}
                />
              </Field>
              <Field
                id="score_100"
                label="직전학기 100점 환산"
                hint="평점으로 계산한 값이에요 (평점 × 10 + 52.5)"
              >
                <Input
                  id="score_100"
                  readOnly
                  tabIndex={-1}
                  value={score100FromGpa(gpa)}
                  placeholder="평점을 입력하면 계산돼요"
                  className="bg-muted"
                />
              </Field>
              <Field
                id="credits"
                label="직전학기 이수학점"
                error={errors.credits?.message}
                hint="성적표의 취득학점이에요. F 과목은 빼고 입력하세요"
              >
                <Input
                  id="credits"
                  inputMode="numeric"
                  placeholder="18"
                  aria-invalid={!!errors.credits}
                  {...register('credits')}
                />
              </Field>
              <Field
                id="gpa_total"
                label="전체 평점평균"
                error={errors.gpa_total?.message}
                hint="한 학기만 다녔다면 직전학기와 같은 값"
              >
                <Input
                  id="gpa_total"
                  inputMode="decimal"
                  placeholder="3.60"
                  aria-invalid={!!errors.gpa_total}
                  {...register('gpa_total')}
                />
              </Field>
              <Field
                id="score_100_total"
                label="전체 100점 환산"
                hint="평점으로 계산한 값이에요 (평점 × 10 + 52.5)"
              >
                <Input
                  id="score_100_total"
                  readOnly
                  tabIndex={-1}
                  value={score100FromGpa(gpaTotal)}
                  placeholder="평점을 입력하면 계산돼요"
                  className="bg-muted"
                />
              </Field>
            </div>
          </section>
        )}

        <section className="grid gap-4 border-t pt-5">
          <div>
            <h2 className="text-sm font-semibold">선택 정보</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              입력하면 더 정확해져요. 비워 두면 해당 조건은 &lsquo;확인 필요&rsquo;로 표시됩니다.
              소득분위·주소·특수자격은 암호화해 저장합니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="income_bracket"
              label="소득분위"
              optional
              error={errors.income_bracket?.message}
              hint="한국장학재단 학자금 지원구간이에요. 가장 최근 학기 구간을 고르세요"
            >
              <NativeSelect id="income_bracket" {...register('income_bracket')}>
                {INCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              id="full_tuition_waiver"
              label="등록금 전액 감면"
              optional
              error={errors.full_tuition_waiver?.message}
              hint="국가장학금 등으로 이번 학기 등록금 전액을 감면받았는지 골라 주세요"
            >
              <NativeSelect id="full_tuition_waiver" {...register('full_tuition_waiver')}>
                <option value="">모름</option>
                <option value="예">예</option>
                <option value="아니오">아니오</option>
              </NativeSelect>
            </Field>
          </div>
          <RegionSelect prefix="self" label="본인 주소" error={errors.self_sido?.message} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register('parent_same')} />
            부모 주소가 본인 주소와 같음
          </label>
          {errors.parent_same && (
            <p role="alert" className="-mt-2 text-xs text-destructive">
              {errors.parent_same.message}
            </p>
          )}
          {!parentSame && (
            <>
              <RegionSelect prefix="parent" label="부모 주소" error={errors.parent_sido?.message} />
              <p className="-mt-2 text-xs text-muted-foreground">해당 없으면 비워 두세요.</p>
            </>
          )}

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">
              특수자격<span className="ml-1 font-normal text-muted-foreground">(선택)</span>
            </legend>
            {me.sensitive_agreed ? (
              <div className="flex flex-wrap items-center gap-4 text-sm">
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
            {errors.special_flags && (
              <p role="alert" className="text-xs text-destructive">
                {errors.special_flags.message}
              </p>
            )}
          </fieldset>
        </section>

        <FormError message={serverMessage ?? save.error?.message} />
        <Button type="submit" size="lg" disabled={save.isPending}>
          {save.isPending ? '저장 중…' : '저장하고 장학금 보기'}
        </Button>
      </form>
    </FormProvider>
  )
}

function AccountActions({ me }: { me: Me }) {
  const navigate = useNavigate()
  const withdraw = useWithdrawSensitive()
  const deleteAccount = useDeleteAccount()
  const toLogin = () => navigate('/login', { replace: true })

  return (
    <section className="mt-8 grid gap-3 border-t pt-5">
      <h2 className="text-sm font-semibold">계정</h2>
      <p className="text-xs text-muted-foreground">{me.email}</p>
      <div className="flex flex-wrap gap-2">
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
