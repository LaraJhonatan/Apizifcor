import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, IsNotEmpty } from 'class-validator';
import { AttributeType } from '../../common/enums/attribute-type.enum';

export class CreateAttributeDefinitionDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  nombre: string;

  @IsString()
  clave: string;

  @IsEnum(AttributeType)
  tipo: AttributeType;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @IsOptional()
  @IsBoolean()
  usarEnVariante?: boolean;

  @IsOptional()
  @IsBoolean()
  filtrable?: boolean;

  @IsOptional()
  @IsNumber()
  orden?: number;
}