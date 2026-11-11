// 프로필 캐릭터 '영앤리치 우왕이' 6종 (T58). 사용자가 직접 올리는 사진 대신 팀 캐릭터를 씁니다.
// 동그랗게 자르지 않고 전신을 그대로, 닉네임 위에 세워서 보여 줍니다 (그림은 360×360 투명 PNG, 바닥 맞춤).
// 매번 랜덤이면 들어올 때마다 바뀌므로, 회원 번호로 하나를 골라 같은 사람은 항상 같은 캐릭터가 나옵니다.
// 캐릭터를 더 그리면 public/avatars/에 넣고 아래 목록에 한 줄 추가하면 됩니다.
const AVATARS = [
  { src: '/avatars/avatar-cool.png', label: '선글라스 우왕이' },
  { src: '/avatars/avatar-basic.png', label: '기본 우왕이' },
  { src: '/avatars/avatar-pass.png', label: '합격! 우왕이' },
  { src: '/avatars/avatar-search.png', label: '장학금 탐색 중 우왕이' },
  { src: '/avatars/avatar-get.png', label: '장학금 GET! 우왕이' },
  { src: '/avatars/avatar-idea.png', label: '아이디어! 우왕이' },
] as const

function avatarFor(userId: number) {
  return AVATARS[Math.abs(userId) % AVATARS.length]
}

export function Avatar({ userId, className = '' }: { userId: number; className?: string }) {
  const avatar = avatarFor(userId)
  return (
    <img
      src={avatar.src}
      alt={`프로필 캐릭터: ${avatar.label}`}
      width={360}
      height={360}
      className={`object-contain ${className}`}
    />
  )
}
