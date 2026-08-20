import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido.' })
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
  @IsString()
  parentId?: string;
}