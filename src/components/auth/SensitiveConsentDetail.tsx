/**
 * 민감정보(선택) 동의 안내 항목 (계획서 4.2). 동의 화면과 프로필 화면의 동의 창이 같은 문장을 보여 줍니다.
 */
export function SensitiveConsentDetail({ id, className }: { id?: string; className?: string }) {
  return (
    <ul id={id} className={className}>
      <li>항목: 특수자격(다자녀·보훈·장애)</li>
      <li>목적: 해당 자격 전용 장학금 판정</li>
      <li>
        동의하지 않아도 서비스를 쓸 수 있고, 특수자격 조건은 &lsquo;확인 필요&rsquo;로 표시됩니다.
      </li>
      <li>프로필 화면에서 언제든 철회할 수 있으며, 철회하면 값을 즉시 삭제합니다.</li>
    </ul>
  )
}
