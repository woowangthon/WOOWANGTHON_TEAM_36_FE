// backend 호출 공통 함수. 항상 상대 경로 /api로 부르고, 인증은 httpOnly 쿠키뿐입니다(frontend CLAUDE.md).

/** 422의 칸별 오류. `path`는 요청 본문 기준(`body`를 뺀 것), 예: `['self_region']`. */
export type FieldError = { path: (string | number)[]; message: string }

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: FieldError[]

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

// FastAPI 오류 본문: {"detail": "문장"} 또는 422의 {"detail": [{loc, msg, type}]}
// 422 메시지는 backend가 한국어로 바꿔 보냅니다(app/core/errors.py).
function fieldErrors(body: unknown): FieldError[] {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (!Array.isArray(detail)) return []
  return detail.flatMap((item) => {
    const { loc, msg } = (item ?? {}) as { loc?: unknown; msg?: unknown }
    if (!Array.isArray(loc) || typeof msg !== 'string') return []
    return [{ path: loc[0] === 'body' ? loc.slice(1) : loc, message: msg }]
  })
}

function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return '입력값을 확인하세요'
  if (status >= 500) return '서버에 문제가 생겼습니다. 잠시 후 다시 시도하세요'
  return `요청이 실패했습니다 (${status})`
}

export async function apiRequest<T>(
  path: string,
  method: Method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(response.status, data), fieldErrors(data))
  }
  return data as T
}
