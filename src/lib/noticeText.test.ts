import { describe, expect, it } from 'vitest'

import {
  cleanNoticeText,
  isConditionalDocument,
  splitDocuments,
  stripConditionalMark,
} from './noticeText'

describe('cleanNoticeText', () => {
  it('문장 앞의 공문 기호를 뗀다', () => {
    expect(cleanNoticeText('※ 의대, 약대 등 특수·전문계열 전공 제외')).toBe(
      '의대, 약대 등 특수·전문계열 전공 제외',
    )
    expect(cleanNoticeText('(*) 우대학과 : 반도체')).toBe('우대학과 : 반도체')
    expect(cleanNoticeText('○ 매 학기 성적 유지')).toBe('매 학기 성적 유지')
  })

  it('항목 사이 동그라미와 가운뎃점 앞뒤 공백을 정리한다', () => {
    expect(cleanNoticeText('(*) 우대학과 : 반도체· ○화학공학· ○전기전자· ○기계관련 전공')).toBe(
      '우대학과 : 반도체·화학공학·전기전자·기계관련 전공',
    )
  })

  it('기호가 없는 문장은 그대로 둔다', () => {
    expect(cleanNoticeText('휴학·복학 등 학적 변동 사항을 신고')).toBe(
      '휴학·복학 등 학적 변동 사항을 신고',
    )
  })

  it('기호뿐인 문장은 지우지 않는다', () => {
    expect(cleanNoticeText('※')).toBe('※')
  })
})

describe('splitDocuments', () => {
  it('해당자 서류를 따로 모은다', () => {
    expect(
      splitDocuments([
        '장학생 지원서',
        '기초생활수급자 증명서(해당자)',
        '자기소개서',
        '헌혈 실적(해당 시)',
      ]),
    ).toEqual({
      common: ['장학생 지원서', '자기소개서'],
      conditional: ['기초생활수급자 증명서(해당자)', '헌혈 실적(해당 시)'],
    })
  })

  it('해당자 표시를 알아본다', () => {
    expect(isConditionalDocument('가족관계증명서(해당하는 경우)')).toBe(true)
    expect(isConditionalDocument('성적증명서')).toBe(false)
  })
})

describe('stripConditionalMark', () => {
  it('끝의 해당자 표시만 뗀다', () => {
    expect(stripConditionalMark('헌혈 실적 확인서(해당자)')).toBe('헌혈 실적 확인서')
    expect(stripConditionalMark('성적증명서')).toBe('성적증명서')
  })
})
