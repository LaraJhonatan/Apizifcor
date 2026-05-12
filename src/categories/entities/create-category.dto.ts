import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @IsOptional()
  @IsNumber()
  orden?: number;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}