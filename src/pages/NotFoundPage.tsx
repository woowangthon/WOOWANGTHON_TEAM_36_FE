import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <Button asChild className="self-start">
        <Link to="/">처음으로</Link>
      </Button>
    </main>
  )
}
