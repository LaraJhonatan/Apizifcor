import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  Equals,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CrearCuentaEmpresaDto {
  @ApiProperty({ example: '900123456' })
  @IsString()
  @Transform(({ value }) => String(value).trim().replace(/\D/g, ''))
  @MinLength(6, { message: 'El NIT debe tener al menos 6 dígitos.' })
  @Matches(/^\d+$/, { message: 'El NIT solo debe contener números.' })
  nit: string;

  @ApiProperty({
    example: 'MiEmpresa2024!',
    description: 'Mínimo 8 caracteres, al menos una letra y un número',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128, { message: 'La contraseña no puede superar 128 caracteres.' })
  @Matches(/[a-zA-Z]/, { message: 'La contraseña debe contener al menos una letra.' })
  @Matches(/\d/, { message: 'La contraseña debe contener al menos un número.' })
  password: string;

  @ApiProperty({
    example: true,
    description: 'El usuario confirma que representa legalmente a la empresa',
  })
  @IsBoolean()
  @Equals(true, { message: 'Debes confirmar que representas legalmente a esta empresa.' })
  aceptaRepresentacion: boolean;
}