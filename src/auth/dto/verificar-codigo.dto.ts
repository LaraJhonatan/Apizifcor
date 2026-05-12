import { IsString, MinLength, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerificarCodigoDto {
  @ApiProperty({ example: '900123456' })
  @IsString()
  @Transform(({ value }) => String(value).trim().replace(/\D/g, ''))
  @MinLength(6, { message: 'El NIT debe tener al menos 6 dígitos.' })
  @Matches(/^\d+$/, { message: 'El NIT solo debe contener números.' })
  nit: string;

  @ApiProperty({ example: '123456', description: 'Código OTP de 6 dígitos' })
  @IsString()
  @Transform(({ value }) => String(value).trim())
  @Length(6, 6, { message: 'El código debe ser de exactamente 6 dígitos.' })
  @Matches(/^\d{6}$/, { message: 'El código debe ser de 6 dígitos numéricos.' })
  codigo: string;
}
