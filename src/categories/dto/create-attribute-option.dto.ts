import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateAttributeOptionDto {
  @IsString()
  @IsNotEmpty()
  atributoId: string;

  @IsString()
  label: string;

  @IsString()
  valor: string;

  @IsOptional()
  @IsNumber()
  orden?: number;
}