import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .min(6, 'A senha deve ter pelo menos 6 caracteres.'),
  rememberMe: z.boolean().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

export type LoginFieldErrors = Partial<
  Record<'email' | 'password' | 'rememberMe', string>
>
