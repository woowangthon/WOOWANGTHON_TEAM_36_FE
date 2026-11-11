import { ExternalLink } from 'lucide-react'
import { useId } from 'react'

type LinkItem = { label: string; href: string; note?: string }

// 수집 출처 바로가기 (계획서 2장의 목록 주소, backend 수집기와 같은 곳)
const SOURCE_LINKS: LinkItem[] = [
  {
    label: '소프트웨어학부 장학 게시판',
    href: 'https://software.cbnu.ac.kr/index.php?mid=sub0401&category=8409',
  },
  { label: 'AI부트캠프사업단 공지', href: 'https://aibc.cbnu.ac.kr/menu/1108' },
  { label: '한국장학재단 공지', href: 'https://www.kosaf.go.kr/ko/notice.do' },
]

// 학사·서류: 상세의 '제출 서류'를 어디서 떼는지 안내합니다.
const ACADEMIC_LINKS: LinkItem[] = [
  { label: '개신누리 (학사 정보)', href: 'https://eis.cbnu.ac.kr/' },
  // 충북대 인터넷 증명발급 (학교 안내문 기준, 개신누리와 같은 아이디·비밀번호)
  {
    label: '증명서 인터넷 발급',
    href: 'https://certi.cbnu.ac.kr/',
    note: '개신누리 아이디로 로그인',
  },
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
  // 제목에 띄어쓰기가 있어 id로 쓰면 aria-labelledby가 여러 id로 나뉘어 이름이 붙지 않습니다. useId로 만듭니다.
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-2 rounded-xl border border-brand-200 bg-background p-3 break-keep sm:p-4"
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
