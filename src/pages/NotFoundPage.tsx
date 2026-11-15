import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-canvas p-6">
      <div className="grid justify-items-center gap-3 text-center">
        {/* 길을 찾는 우왕이 (꾸밈용) */}
        <img
          src="/avatars/avatar-search.png"
          alt=""
          width={360}
          height={360}
          className="size-32 object-contain"
        />
        <h1 className="text-2xl font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-muted-foreground">주소가 바뀌었거나 없어진 화면이에요.</p>
        <Button asChild size="lg" className="mt-3">
          <Link to="/">처음으로</Link>
        </Button>
      </div>
    </main>
  )
}
