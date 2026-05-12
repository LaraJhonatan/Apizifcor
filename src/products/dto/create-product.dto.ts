import {
  IsString, IsOptional, IsEnum,
  IsNumber, IsArray, ValidateNested, IsBoolean, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../common/enums/product-status.enum';

export class ProductAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  atributoId: string;

  @IsOptional()
  @IsString()
  valor?: string;
}

export class ProductImageDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @IsOptional()
  @IsNumber()
  orden?: number;
}

export class ProductVariantDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  precio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueDto)
  atributos?: ProductAttributeValueDto[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  empresaId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  subcategoryId?: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsNumber()
  precioBase?: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  estado?: ProductStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeValueDto)
  atributos?: ProductAttributeValueDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  imagenes?: ProductImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variantes?: ProductVariantDto[];
}