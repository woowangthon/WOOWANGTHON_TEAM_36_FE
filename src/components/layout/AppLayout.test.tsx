import { fireEvent, screen, waitFor } from '@testing-library/react'

import { resetMockState } from '@/mocks/handlers'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

describe('상단 더보기 메뉴', () => {
  it('메뉴를 열어 항목을 누르면 이동하고 메뉴가 닫힌다', async () => {
    const app = renderApp('/dashboard')
    const button = await screen.findByRole('button', { name: '메뉴' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()

    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('link', { name: '내 장학금' }))

    await waitFor(() => expect(app.path()).toBe('/my'))
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()
  })

  it('Esc를 누르면 닫히고 더보기 버튼으로 초점이 돌아간다', async () => {
    renderApp('/dashboard')
    const button = await screen.findByRole('button', { name: '메뉴' })
    fireEvent.click(button)
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })
})
