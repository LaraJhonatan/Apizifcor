import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: '900123456',
    description: 'NIT de la empresa o correo corporativo registrado',
  })
  @IsString()
  @IsNotEmpty({ message: 'El NIT o correo es requerido.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  identificador: string;

  @ApiProperty({ example: 'MiEmpresa2024!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida.' })
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
