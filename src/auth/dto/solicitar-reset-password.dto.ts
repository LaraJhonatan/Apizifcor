import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SolicitarResetPasswordDto {
  @ApiProperty({
    example: '900123456',
    description: 'NIT de la empresa o correo corporativo registrado',
  })
  @IsString()
  @IsNotEmpty({ message: 'El NIT o correo es requerido.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  identificador: string;
}
