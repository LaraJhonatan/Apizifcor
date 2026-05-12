import { IsString, MinLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConsultarNitDto {
  @ApiProperty({ example: '900123456', description: 'NIT sin dígito de verificación' })
  @IsString()
  @Transform(({ value }) => String(value).trim().replace(/\D/g, ''))
  @MinLength(6, { message: 'El NIT debe tener al menos 6 dígitos.' })
  @Matches(/^\d+$/, { message: 'El NIT solo debe contener números.' })
  nit: string;
}
