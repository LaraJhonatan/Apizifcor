import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestablecerPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido.' })
  token: string;

  @ApiProperty({ example: 'MiEmpresa2024!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(128)
  password: string;
}
