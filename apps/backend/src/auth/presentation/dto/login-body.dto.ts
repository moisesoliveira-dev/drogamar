import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginBodyDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Informe sua senha.' })
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
