import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.'),
  // Senha: sem trim e sem limite artificial no frontend
  password: z.string().min(1, 'Informe sua senha.'),
  rememberMe: z.boolean().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

export type LoginFieldErrors = Partial<
  Record<'email' | 'password' | 'rememberMe', string>
>

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
})

export const loginResponseSchema = z.object({
  user: authUserSchema,
})

export type AuthUser = z.infer<typeof authUserSchema>
