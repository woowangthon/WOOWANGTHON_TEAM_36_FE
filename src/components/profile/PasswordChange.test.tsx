// 내 정보 화면의 비밀번호 변경 (계획서 7.3, T38).
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import { mockMe } from '@/mocks/data'
import { MOCK_PASSWORD, resetMockState } from '@/mocks/handlers'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/renderApp'

beforeEach(() => resetMockState())

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function openForm() {
  renderApp('/profile')
  fireEvent.click(await screen.findByRole('button', { name: '비밀번호 변경' }))
}

function fill(current: string, next: string, confirm = next) {
  type('현재 비밀번호', current)
  type('새 비밀번호', next)
  type('새 비밀번호 확인', confirm)
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }))
}

describe('비밀번호 변경', () => {
  it('Google 전용 계정은 변경 대신 안내만 보인다', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ ...mockMe, has_password: false })),
    )
    renderApp('/profile')
    expect(await screen.findByText('Google 계정으로 로그인하는 계정이에요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '비밀번호 변경' })).not.toBeInTheDocument()
  })

  it('새 비밀번호와 확인이 다르면 알려 준다', async () => {
    await openForm()
    fill(MOCK_PASSWORD, 'newpass34#', 'newpass34$')
    expect(await screen.findByText('비밀번호가 서로 달라요')).toBeInTheDocument()
  })

  it('현재 비밀번호가 틀리면 그 칸 아래에 알려 준다', async () => {
    await openForm()
    fill('wrong-pass1!', 'newpass34#')
    expect(await screen.findByText('현재 비밀번호가 맞지 않아요')).toBeInTheDocument()
    expect(screen.getByLabelText('현재 비밀번호')).toHaveAttribute('aria-invalid', 'true')
  })

  it('시도가 너무 많으면 서버 문장을 보여 준다', async () => {
    server.use(
      http.put('/api/auth/me/password', () =>
        HttpResponse.json(
          { detail: '비밀번호 변경을 너무 많이 시도했어요. 잠시 후 다시 시도하세요' },
          { status: 429 },
        ),
      ),
    )
    await openForm()
    fill(MOCK_PASSWORD, 'newpass34#')
    expect(await screen.findByText(/잠시 후 다시 시도하세요/)).toBeInTheDocument()
  })

  it('바꾸면 안내하고 폼을 닫는다', async () => {
    await openForm()
    fill(MOCK_PASSWORD, 'newpass34#')
    expect(
      await screen.findByText('비밀번호를 바꿨어요. 다른 기기에서는 다시 로그인해야 해요'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('현재 비밀번호')).not.toBeInTheDocument())
  })
})
