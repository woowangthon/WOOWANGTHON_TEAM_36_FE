import { ExternalLink } from 'lucide-react'

type LinkItem = { label: string; href: string; note?: string }

// 수집 출처 바로가기 (계획서 2장의 목록 주소, backend 수집기와 같은 곳)
const SOURCE_LINKS: LinkItem[] = [
  { label: '소프트웨어학부', href: 'https://software.cbnu.ac.kr/' },
  { label: 'AI부트캠프사업단 공지', href: 'https://aibc.cbnu.ac.kr/menu/1108' },
  { label: '한국장학재단 공지', href: 'https://www.kosaf.go.kr/ko/notice.do' },
]

// 학사·서류: 상세의 '제출 서류'를 어디서 떼는지 안내합니다.
const ACADEMIC_LINKS: LinkItem[] = [
  { label: '개신누리 (학사 정보)', href: 'https://eis.cbnu.ac.kr/' },
  { label: '증명서 인터넷 발급', href: 'https://www.certpia.com/', note: '충북대학교 선택' },
  {
    label: '학자금 지원구간 확인',
    href: 'https://www.kosaf.go.kr/',
    note: '한국장학재단 로그인 후',
  },
]

/** 넓은 화면(1024px 이상) 왼쪽 사이드바의 바로가기 (T40). API를 부르지 않습니다. */
export function SidePanel({ className = '' }: { className?: string }) {
  return (
    <div className={`gap-4 ${className}`}>
      <LinkGroup title="공지 출처 바로가기" links={SOURCE_LINKS} />
      <LinkGroup title="학사·서류" links={ACADEMIC_LINKS} />
    </div>
  )
}

function LinkGroup({ title, links }: { title: string; links: LinkItem[] }) {
  const id = `side-${title}`
  return (
    <section
      aria-labelledby={id}
      className="grid gap-2 rounded-xl border border-brand-200 bg-background p-3 sm:p-4"
    >
      <h2 id={id} className="text-sm font-semibold text-brand-900">
        {title}
      </h2>
      <ul className="grid gap-1.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 text-foreground hover:text-brand-800 hover:underline"
            >
              {link.label}
              <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            </a>
            {link.note && <p className="text-xs text-muted-foreground">{link.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
