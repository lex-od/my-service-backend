import { IsEmail, IsString, IsStrongPassword, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    },
    {
      message:
        'password requirements: 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number',
    },
  )
  password: string;
}
