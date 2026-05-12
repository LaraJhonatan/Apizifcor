import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidarRutDto {
  @ApiProperty({ example: '901561666' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'El NIT debe contener solo dígitos' })
  nit: string;
}