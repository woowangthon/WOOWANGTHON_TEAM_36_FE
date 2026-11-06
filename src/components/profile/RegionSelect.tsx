import { useFormContext, useWatch } from 'react-hook-form'

import { Label, NativeSelect } from '@/components/ui/input'

import type { ProfileFormValues } from './profileForm'
import { REGIONS, SIDO_LIST } from './regions'

type Props = {
  prefix: 'self' | 'parent'
  label: string
  error?: string
}

/** 시/도 + 시/군/구 선택. 시/도를 바꾸면 시/군/구를 비웁니다. */
export function RegionSelect({ prefix, label, error }: Props) {
  const { register, setValue, control } = useFormContext<ProfileFormValues>()
  const sido = useWatch({ control, name: `${prefix}_sido` })
  const sigungus = REGIONS[sido] ?? []
  const sidoField = register(`${prefix}_sido`)

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">
        {label}
        <span className="ml-1 font-normal text-muted-foreground">(선택)</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor={`${prefix}_sido`} className="sr-only">
            {label} 시/도
          </Label>
          <NativeSelect
            id={`${prefix}_sido`}
            aria-invalid={!!error}
            {...sidoField}
            onChange={(event) => {
              sidoField.onChange(event)
              setValue(`${prefix}_sigungu`, '')
            }}
          >
            <option value="">시/도</option>
            {SIDO_LIST.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`${prefix}_sigungu`} className="sr-only">
            {label} 시/군/구
          </Label>
          <NativeSelect id={`${prefix}_sigungu`} {...register(`${prefix}_sigungu`)}>
            <option value="">{!sido || sigungus.length ? '시/군/구' : '해당 없음'}</option>
            {sigungus.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
