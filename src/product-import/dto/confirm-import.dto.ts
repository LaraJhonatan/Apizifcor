import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString,
  ValidateNested, ArrayMaxSize, ArrayNotEmpty, Min,
} from 'class-validator';

export class ImportedProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Cada producto necesita un nombre.' })
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty({ message: 'Cada producto necesita una categoría.' })
  categoryId: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioBase?: number;

  @IsOptional()
  @IsIn(['COP', 'USD', 'EUR'])
  moneda?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsBoolean()
  pagableEnLinea?: boolean;
}

export class ConfirmImportDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'No hay productos para crear.' })
  @ArrayMaxSize(200, { message: 'Máximo 200 productos por importación.' })
  @ValidateNested({ each: true })
  @Type(() => ImportedProductDto)
  productos: ImportedProductDto[];
}
