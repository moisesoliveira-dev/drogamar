import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

afterEach(() => {
  cleanup()
})

function renderForm(props: Partial<ComponentProps<typeof LoginForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn()
  const view = render(
    <MemoryRouter>
      <LoginForm onSubmit={onSubmit} {...props} />
    </MemoryRouter>,
  )
  return { onSubmit, ...view }
}

describe('LoginForm', () => {
  it('submete com Enter', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.type(screen.getByLabelText('E-mail'), 'user@drogamar.com')
    await user.type(screen.getByLabelText('Senha'), 'Segredo!123')
    await user.keyboard('{Enter}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'user@drogamar.com',
      password: 'Segredo!123',
      rememberMe: false,
    })
  })

  it('não chama onSubmit quando loading', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm({ loading: true })

    expect(screen.getByRole('button', { name: /Entrando/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Entrando/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('alterna mostrar/ocultar senha sem alterar o valor', async () => {
    const user = userEvent.setup()
    renderForm()

    const password = screen.getByLabelText('Senha')
    await user.type(password, 'Segredo!123')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Segredo!123')

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('exibe erro de formulário acessível', () => {
    renderForm({
      formError: 'Não foi possível entrar. Verifique seu e-mail e senha.',
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Não foi possível entrar/i,
    )
  })

  it('associa labels e autocomplete corretos', () => {
    renderForm()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'autoComplete',
      'username',
    )
    expect(screen.getByLabelText('Senha')).toHaveAttribute(
      'autoComplete',
      'current-password',
    )
  })

  it('mostra erros de campo', async () => {
    renderForm({
      fieldErrors: {
        email: 'Informe um e-mail válido.',
        password: 'Informe sua senha.',
      },
    })
    await waitFor(() => {
      expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
      expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('E-mail')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})
