import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
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
        'Minimum: 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number',
    },
  )
  password?: string | null;

  @ValidateIf((object, value) => value !== undefined)
  @IsBoolean()
  isVerified?: boolean;
}
