/**
 * 상세 화면에 보이는 공지 문장 다듬기. 저장된 값은 바꾸지 않고 화면에서만 정리합니다.
 */

// 공문에서 문장·항목 앞에 붙이는 기호: ※, (*), *, ○, ◦, ●, ■, □, -, ·
const LEADING_MARKS = /^(?:\s*(?:※|\(\*\)|\*|○|◦|●|■|□|-|·)\s*)+/
// 항목 사이의 동그라미 기호 ("반도체· ○화학공학")
const INNER_BULLETS = /\s*[○◦●]\s*/g

/** 문장 앞의 공문 기호와 항목 사이 동그라미를 떼고 공백을 하나로 줄입니다. */
export function cleanNoticeText(text: string): string {
  const cleaned = text
    .replace(LEADING_MARKS, '')
    .replace(INNER_BULLETS, ' ')
    .replace(/\s*·\s*/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || text.trim()
}

/** "(해당자)"·"해당자에 한함"처럼 일부 학생만 내는 서류인지 봅니다. */
export function isConditionalDocument(doc: string): boolean {
  return /해당자|해당 시|해당시|해당하는 경우/.test(doc)
}

/** 해당자 서류 묶음 안에서는 반복되는 "(해당자)" 표시를 뗍니다. */
export function stripConditionalMark(doc: string): string {
  return doc.replace(/\s*\((?:해당자|해당 시|해당시|해당하는 경우)\)\s*$/, '').trim() || doc
}

/** 제출 서류를 모두 내는 서류와 해당자만 내는 서류로 나눕니다. 순서는 원문 그대로입니다. */
export function splitDocuments(docs: string[]): { common: string[]; conditional: string[] } {
  const common: string[] = []
  const conditional: string[] = []
  for (const doc of docs) (isConditionalDocument(doc) ? conditional : common).push(doc)
  return { common, conditional }
}
