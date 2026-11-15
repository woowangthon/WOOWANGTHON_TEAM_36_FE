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

/** 넓은 화면(1024px 이상) 사이드바의 바로가기 (T40). 상자 없이 글 목록으로 가볍게 둡니다. API를 부르지 않습니다. */
export function SidePanel({ className = '' }: { className?: string }) {
  return (
    <div className={`gap-6 ${className}`}>
      <LinkGroup title="공지 출처 바로가기" links={SOURCE_LINKS} />
      <LinkGroup title="학사·서류" links={ACADEMIC_LINKS} />
    </div>
  )
}

function LinkGroup({ title, links }: { title: string; links: LinkItem[] }) {
  // 제목에 띄어쓰기가 있어 id로 쓰면 aria-labelledby가 여러 id로 나뉘어 이름이 붙지 않습니다. useId로 만듭니다.
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2.5 break-keep">
      <h2 id={id} className="text-[13px] font-bold">
        {title}
      </h2>
      <ul className="grid gap-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1 text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              {link.label}
              <ExternalLink aria-hidden="true" className="mt-1 size-3 shrink-0 opacity-60" />
            </a>
            {link.note && <p className="mt-0.5 text-xs text-muted-foreground/80">{link.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
