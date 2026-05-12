import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateAttributeOptionDto {
  @IsUUID()
  atributoId: string;

  @IsString()
  label: string;

  @IsString()
  valor: string;

  @IsOptional()
  @IsNumber()
  orden?: number;
}